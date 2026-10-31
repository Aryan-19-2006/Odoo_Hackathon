import { database } from "../../server/src/database.js";
import { pathToFileURL } from "node:url";

interface JobRow {
  id: string;
  type: string;
  payload: string;
  attempts: number;
}

interface PaymentPayload {
  paymentId: string;
}

const pollIntervalMs = Number(process.env.WORKER_POLL_INTERVAL_MS ?? 1000);
const maxAttempts = 5;
const staleClaimMs = 60_000;
let stopping = false;

function claimNextJob(): JobRow | undefined {
  database.exec("BEGIN IMMEDIATE");
  try {
    const staleBefore = new Date(Date.now() - staleClaimMs).toISOString();
    database
      .prepare("UPDATE jobs SET status = 'queued', claimed_at = NULL WHERE status = 'processing' AND claimed_at < ?")
      .run(staleBefore);

    const job = database
      .prepare("SELECT id, type, payload, attempts FROM jobs WHERE status = 'queued' ORDER BY created_at LIMIT 1")
      .get() as unknown as JobRow | undefined;
    if (!job) {
      database.exec("COMMIT");
      return undefined;
    }

    database
      .prepare("UPDATE jobs SET status = 'processing', attempts = attempts + 1, claimed_at = ? WHERE id = ?")
      .run(new Date().toISOString(), job.id);
    database.exec("COMMIT");
    return { ...job, attempts: job.attempts + 1 };
  } catch (error) {
    database.exec("ROLLBACK");
    throw error;
  }
}

function processPayment(job: JobRow): void {
  if (job.type !== "process_payment") throw new Error(`Unsupported job type: ${job.type}`);

  const payload = JSON.parse(job.payload) as PaymentPayload;
  if (typeof payload.paymentId !== "string") throw new Error("Payment job is missing paymentId");

  const payment = database
    .prepare("SELECT id, invoice_id, status FROM payments WHERE id = ?")
    .get(payload.paymentId) as { id: string; invoice_id: string; status: string } | undefined;
  if (!payment) throw new Error(`Payment ${payload.paymentId} was not found`);

  database.exec("BEGIN IMMEDIATE");
  try {
    if (payment.status === "succeeded") {
      database.prepare("UPDATE jobs SET status = 'completed', claimed_at = NULL WHERE id = ?").run(job.id);
      database.exec("COMMIT");
      return;
    }

    const invoice = database
      .prepare("SELECT status FROM invoices WHERE id = ?")
      .get(payment.invoice_id) as { status: string } | undefined;
    if (!invoice || invoice.status !== "open") {
      database.prepare("UPDATE payments SET status = 'failed' WHERE id = ?").run(payment.id);
      database.prepare("UPDATE jobs SET status = 'failed', claimed_at = NULL WHERE id = ?").run(job.id);
      database.exec("COMMIT");
      return;
    }

    database.prepare("UPDATE payments SET status = 'succeeded' WHERE id = ?").run(payment.id);
    database.prepare("UPDATE invoices SET status = 'paid' WHERE id = ?").run(payment.invoice_id);
    database.prepare("UPDATE jobs SET status = 'completed', claimed_at = NULL WHERE id = ?").run(job.id);
    database.exec("COMMIT");
  } catch (error) {
    database.exec("ROLLBACK");
    throw error;
  }
}

function failJob(job: JobRow, error: unknown): void {
  const message = error instanceof Error ? error.message : "Unknown worker error";
  console.error(`Job ${job.id} failed on attempt ${job.attempts}: ${message}`);

  database.exec("BEGIN IMMEDIATE");
  try {
    const retry = job.attempts < maxAttempts;
    database
      .prepare("UPDATE jobs SET status = ?, claimed_at = NULL WHERE id = ?")
      .run(retry ? "queued" : "failed", job.id);
    if (!retry && job.type === "process_payment") {
      try {
        const payload = JSON.parse(job.payload) as PaymentPayload;
        database.prepare("UPDATE payments SET status = 'failed' WHERE id = ? AND status = 'queued'").run(payload.paymentId);
      } catch {
        // The job is still marked failed if its payload cannot be decoded.
      }
    }
    database.exec("COMMIT");
  } catch (updateError) {
    database.exec("ROLLBACK");
    console.error(`Could not update failed job ${job.id}`, updateError);
  }
}

async function run(): Promise<void> {
  console.log("Billing worker started (local simulated payment processor)");
  while (!stopping) {
    try {
      if (processNextJob()) continue;
    } catch (error) {
      console.error("Worker poll failed", error);
    }

    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  }
  database.close();
}

export function processNextJob(): boolean {
  const job = claimNextJob();
  if (!job) return false;
  try {
    processPayment(job);
    console.log(`Job ${job.id} completed`);
  } catch (error) {
    failJob(job, error);
  }
  return true;
}

process.on("SIGINT", () => {
  stopping = true;
});
process.on("SIGTERM", () => {
  stopping = true;
});

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  void run();
}