import { database } from "../../database.js";
import type { HttpResult } from "../../http.js";

interface InvoiceTotalsRow {
  currency: string;
  invoice_count: number;
  paid_count: number;
  open_count: number;
  paid_minor: number;
  open_minor: number;
}

export function handleBillingRoutes(method: string, pathname: string): HttpResult | undefined {
  if (method !== "GET" || pathname !== "/api/billing/summary") return undefined;

  const invoiceTotals = database
    .prepare(
      `SELECT currency,
              COUNT(*) AS invoice_count,
              SUM(CASE WHEN status = 'paid' THEN 1 ELSE 0 END) AS paid_count,
              SUM(CASE WHEN status = 'open' THEN 1 ELSE 0 END) AS open_count,
              SUM(CASE WHEN status = 'paid' THEN total_minor ELSE 0 END) AS paid_minor,
              SUM(CASE WHEN status = 'open' THEN total_minor ELSE 0 END) AS open_minor
       FROM invoices
       WHERE status IN ('paid', 'open')
       GROUP BY currency
       ORDER BY currency`,
    )
    .all() as unknown as InvoiceTotalsRow[];
  const queuedPaymentCount = database
    .prepare("SELECT COUNT(*) AS count FROM payments WHERE status = 'queued'")
    .get() as { count: number };

  return {
    status: 200,
    body: {
      data: {
        currencies: invoiceTotals,
        queuedPaymentCount: queuedPaymentCount.count,
      },
    },
  };
}