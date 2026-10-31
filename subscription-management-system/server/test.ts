import assert from "node:assert/strict";
import { after, test } from "node:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";

const testDirectory = mkdtempSync(join(tmpdir(), "subscription-billing-"));
process.env.DATABASE_PATH = join(testDirectory, `${randomUUID()}.sqlite`);

const { database } = await import("./src/database.js");
const { handleBillingRoutes } = await import("./src/modules/billing/routes.js");
const { handleDiscountRoutes } = await import("./src/modules/discounts/routes.js");
const { handleInvoiceRoutes } = await import("./src/modules/invoices/routes.js");
const { handlePaymentRoutes } = await import("./src/modules/payments/routes.js");
const { handleTaxRoutes } = await import("./src/modules/taxes/routes.js");
const { processNextJob } = await import("../worker/src/main.js");

after(() => {
  database.close();
  rmSync(testDirectory, { recursive: true, force: true });
});

test("discount, tax, invoice, payment, and worker flow", () => {
  const discountResult = handleDiscountRoutes("POST", "/api/discounts", {
    name: "Launch offer",
    type: "percentage",
    value: 10,
  });
  assert.ok(discountResult);
  assert.equal(discountResult.status, 201);
  const discount = (discountResult.body as { data: { id: string } }).data;

  const taxResult = handleTaxRoutes("POST", "/api/taxes", {
    name: "Standard VAT",
    rateBps: 825,
  });
  assert.ok(taxResult);
  assert.equal(taxResult.status, 201);
  const tax = (taxResult.body as { data: { id: string } }).data;

  const invoiceResult = handleInvoiceRoutes("POST", "/api/invoices", {
    customerName: "Example Customer",
    currency: "USD",
    discountId: discount.id,
    taxId: tax.id,
    lines: [{ description: "Monthly plan", quantity: 1, unitAmountMinor: 10000 }],
  });
  assert.ok(invoiceResult);
  assert.equal(invoiceResult.status, 201);
  const invoice = (invoiceResult.body as {
    data: { id: string; subtotal_minor: number; discount_minor: number; tax_minor: number; total_minor: number };
  }).data;
  assert.equal(invoice.subtotal_minor, 10000);
  assert.equal(invoice.discount_minor, 1000);
  assert.equal(invoice.tax_minor, 743);
  assert.equal(invoice.total_minor, 9743);

  const paymentResult = handlePaymentRoutes("POST", `/api/invoices/${invoice.id}/payments`);
  assert.ok(paymentResult);
  assert.equal(paymentResult.status, 202);
  assert.equal(processNextJob(), true);

  const paidInvoice = database
    .prepare("SELECT status FROM invoices WHERE id = ?")
    .get(invoice.id) as { status: string };
  const paidPayment = database
    .prepare("SELECT status FROM payments WHERE invoice_id = ?")
    .get(invoice.id) as { status: string };
  assert.equal(paidInvoice.status, "paid");
  assert.equal(paidPayment.status, "succeeded");
  assert.equal(processNextJob(), false);

  const summary = handleBillingRoutes("GET", "/api/billing/summary");
  assert.ok(summary);
  const totals = (summary.body as {
    data: {
      currencies: Array<{ currency: string; invoice_count: number; paid_minor: number }>;
      queuedPaymentCount: number;
    };
  }).data;
  assert.deepEqual(
    totals.currencies.map((row) => [
      row.currency,
      row.invoice_count,
      row.paid_count,
      row.open_count,
      row.paid_minor,
      row.open_minor,
    ]),
    [["USD", 1, 1, 0, 9743, 0]],
  );
  assert.equal(totals.queuedPaymentCount, 0);
});