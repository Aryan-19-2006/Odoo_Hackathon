import { randomUUID } from "node:crypto";
import { database } from "../../database.js";
import { HttpError, type HttpResult } from "../../http.js";

interface PaymentRow {
  id: string;
  invoice_id: string;
  amount_minor: number;
  currency: string;
  status: "queued" | "succeeded" | "failed";
  created_at: string;
}

export function handlePaymentRoutes(method: string, pathname: string): HttpResult | undefined {
  if (method === "GET" && pathname === "/api/payments") {
    const payments = database
      .prepare("SELECT * FROM payments ORDER BY created_at DESC LIMIT 100")
      .all() as unknown as PaymentRow[];
    return { status: 200, body: { data: payments } };
  }

  const match = pathname.match(/^\/api\/invoices\/([0-9a-f-]{36})\/payments$/i);
  if (method !== "POST" || !match) return undefined;

  const invoice = database
    .prepare("SELECT id, total_minor, currency, status FROM invoices WHERE id = ?")
    .get(match[1]) as
    | { id: string; total_minor: number; currency: string; status: "open" | "paid" | "void" }
    | undefined;
  if (!invoice) throw new HttpError(404, "Invoice not found");
  if (invoice.status !== "open") throw new HttpError(409, "Only open invoices can be paid");

  const existing = database
    .prepare("SELECT id FROM payments WHERE invoice_id = ? AND status = 'queued'")
    .get(invoice.id);
  if (existing) throw new HttpError(409, "A payment is already queued for this invoice");

  const payment: PaymentRow = {
    id: randomUUID(),
    invoice_id: invoice.id,
    amount_minor: invoice.total_minor,
    currency: invoice.currency,
    status: "queued",
    created_at: new Date().toISOString(),
  };
  const jobId = randomUUID();

  database.exec("BEGIN IMMEDIATE");
  try {
    database
      .prepare(
        "INSERT INTO payments (id, invoice_id, amount_minor, currency, status, created_at) VALUES (?, ?, ?, ?, ?, ?)",
      )
      .run(
        payment.id,
        payment.invoice_id,
        payment.amount_minor,
        payment.currency,
        payment.status,
        payment.created_at,
      );
    database
      .prepare("INSERT INTO jobs (id, type, payload, status, created_at) VALUES (?, ?, ?, 'queued', ?)")
      .run(jobId, "process_payment", JSON.stringify({ paymentId: payment.id }), payment.created_at);
    database.exec("COMMIT");
  } catch (error) {
    database.exec("ROLLBACK");
    throw error;
  }

  return { status: 202, body: { data: payment, message: "Payment queued for processing" } };
}