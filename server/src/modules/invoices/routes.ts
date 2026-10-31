import { randomUUID } from "node:crypto";
import { database } from "../../database.js";
import { HttpError, type HttpResult, isRecord } from "../../http.js";

interface InvoiceRow {
  id: string;
  customer_name: string;
  currency: string;
  subtotal_minor: number;
  discount_minor: number;
  tax_minor: number;
  total_minor: number;
  status: "open" | "paid" | "void";
  created_at: string;
}

interface InvoiceLineRow {
  id: string;
  description: string;
  quantity: number;
  unit_amount_minor: number;
}

interface InvoiceLineInput {
  description: string;
  quantity: number;
  unitAmountMinor: number;
}

function safeNumber(value: bigint, message: string): number {
  const result = Number(value);
  if (!Number.isSafeInteger(result)) throw new HttpError(400, message);
  return result;
}

function readLines(value: unknown): InvoiceLineInput[] {
  if (!Array.isArray(value) || value.length === 0 || value.length > 100) {
    throw new HttpError(400, "lines must contain between 1 and 100 items");
  }

  return value.map((line, index) => {
    if (!isRecord(line)) throw new HttpError(400, `lines[${index}] must be an object`);
    const { description, quantity, unitAmountMinor } = line;
    if (typeof description !== "string" || description.trim().length === 0 || description.length > 250) {
      throw new HttpError(400, `lines[${index}].description must contain 1 to 250 characters`);
    }
    if (!Number.isSafeInteger(quantity) || (quantity as number) < 1 || (quantity as number) > 100000) {
      throw new HttpError(400, `lines[${index}].quantity must be an integer from 1 to 100000`);
    }
    if (
      !Number.isSafeInteger(unitAmountMinor) ||
      (unitAmountMinor as number) < 0 ||
      (unitAmountMinor as number) > Number.MAX_SAFE_INTEGER
    ) {
      throw new HttpError(400, `lines[${index}].unitAmountMinor must be a non-negative safe integer`);
    }
    return {
      description: description.trim(),
      quantity: quantity as number,
      unitAmountMinor: unitAmountMinor as number,
    };
  });
}

function getInvoice(id: string): (InvoiceRow & { lines: InvoiceLineRow[] }) | undefined {
  const invoice = database
    .prepare("SELECT * FROM invoices WHERE id = ?")
    .get(id) as unknown as InvoiceRow | undefined;
  if (!invoice) return undefined;

  const lines = database
    .prepare(
      "SELECT id, description, quantity, unit_amount_minor FROM invoice_lines WHERE invoice_id = ?",
    )
    .all(id) as unknown as InvoiceLineRow[];
  return { ...invoice, lines };
}

export function handleInvoiceRoutes(
  method: string,
  pathname: string,
  body: unknown,
): HttpResult | undefined {
  if (method === "GET" && pathname === "/api/invoices") {
    const invoices = database
      .prepare("SELECT * FROM invoices ORDER BY created_at DESC LIMIT 100")
      .all() as unknown as InvoiceRow[];
    return { status: 200, body: { data: invoices.map((invoice) => getInvoice(invoice.id)) } };
  }

  const invoiceMatch = pathname.match(/^\/api\/invoices\/([0-9a-f-]{36})$/i);
  if (method === "GET" && invoiceMatch) {
    const invoice = getInvoice(invoiceMatch[1]);
    if (!invoice) throw new HttpError(404, "Invoice not found");
    return { status: 200, body: { data: invoice } };
  }

  if (method !== "POST" || pathname !== "/api/invoices") return undefined;
  if (!isRecord(body)) throw new HttpError(400, "Request body must be a JSON object");

  const { customerName, currency, discountId, taxId } = body;
  if (typeof customerName !== "string" || customerName.trim().length < 2 || customerName.length > 160) {
    throw new HttpError(400, "customerName must contain 2 to 160 characters");
  }
  if (typeof currency !== "string" || !/^[A-Z]{3}$/.test(currency)) {
    throw new HttpError(400, "currency must be a 3-letter uppercase ISO currency code");
  }
  if (discountId !== undefined && typeof discountId !== "string") {
    throw new HttpError(400, "discountId must be a string");
  }
  if (taxId !== undefined && typeof taxId !== "string") {
    throw new HttpError(400, "taxId must be a string");
  }

  const lines = readLines(body.lines);
  const subtotal = lines.reduce((sum, line) => {
    const lineTotal = BigInt(line.quantity) * BigInt(line.unitAmountMinor);
    return sum + lineTotal;
  }, 0n);
  const subtotalMinor = safeNumber(subtotal, "Invoice subtotal exceeds the supported amount");

  let discountMinor = 0;
  if (discountId !== undefined) {
    const discount = database
      .prepare("SELECT type, value FROM discounts WHERE id = ?")
      .get(discountId) as { type: "percentage" | "fixed"; value: number } | undefined;
    if (!discount) throw new HttpError(400, "discountId does not refer to an existing discount");
    const amount =
      discount.type === "percentage"
        ? (BigInt(subtotalMinor) * BigInt(discount.value) + 50n) / 100n
        : BigInt(discount.value);
    discountMinor = safeNumber(amount > subtotal ? subtotal : amount, "Discount exceeds supported amount");
  }

  let taxMinor = 0;
  if (taxId !== undefined) {
    const tax = database
      .prepare("SELECT rate_bps FROM taxes WHERE id = ?")
      .get(taxId) as { rate_bps: number } | undefined;
    if (!tax) throw new HttpError(400, "taxId does not refer to an existing tax rate");
    const taxableAmount = BigInt(subtotalMinor - discountMinor);
    taxMinor = safeNumber(
      (taxableAmount * BigInt(tax.rate_bps) + 5000n) / 10000n,
      "Tax exceeds supported amount",
    );
  }

  const invoice: InvoiceRow = {
    id: randomUUID(),
    customer_name: customerName.trim(),
    currency,
    subtotal_minor: subtotalMinor,
    discount_minor: discountMinor,
    tax_minor: taxMinor,
    total_minor: safeNumber(BigInt(subtotalMinor - discountMinor + taxMinor), "Invoice total exceeds supported amount"),
    status: "open",
    created_at: new Date().toISOString(),
  };

  database.exec("BEGIN IMMEDIATE");
  try {
    database
      .prepare(
        `INSERT INTO invoices
          (id, customer_name, currency, subtotal_minor, discount_minor, tax_minor, total_minor, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        invoice.id,
        invoice.customer_name,
        invoice.currency,
        invoice.subtotal_minor,
        invoice.discount_minor,
        invoice.tax_minor,
        invoice.total_minor,
        invoice.status,
        invoice.created_at,
      );

    const insertLine = database.prepare(
      "INSERT INTO invoice_lines (id, invoice_id, description, quantity, unit_amount_minor) VALUES (?, ?, ?, ?, ?)",
    );
    for (const line of lines) {
      insertLine.run(randomUUID(), invoice.id, line.description, line.quantity, line.unitAmountMinor);
    }
    database.exec("COMMIT");
  } catch (error) {
    database.exec("ROLLBACK");
    throw error;
  }

  return { status: 201, body: { data: getInvoice(invoice.id) } };
}