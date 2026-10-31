const path = require('node:path');
require(require.resolve('dotenv', { paths: [path.resolve(__dirname, '../server')] }))
  .config({ path: path.resolve(__dirname, '../.env') });

const { connectDatabase } = require('../server/src/config/database');
const service = require('../server/src/modules/shared/service');
const invoiceService = require('../server/src/modules/invoices/service');
const { mongoose } = require('../server/src/modules/shared/model');

const pollIntervalMs = Number(process.env.BILLING_WORKER_POLL_MS || 60000);
const actorId = 'system:billing-worker';
let stopping = false;

if (!Number.isInteger(pollIntervalMs) || pollIntervalMs < 1000) {
  throw new Error('BILLING_WORKER_POLL_MS must be an integer of at least 1000');
}

async function processDueBilling() {
  const now = new Date();
  const batch = await service.listDueForBilling({ page: 1, limit: 100, asOf: now });
  let processed = 0;

  for (const subscription of batch.results) {
    const dueAt = new Date(subscription.nextBillingDate);
    const billingKey = `billing:${subscription.subscriptionId}:${dueAt.toISOString()}`;
    try {
      const invoice = await invoiceService.createInvoice({
        billingKey,
        customerId: subscription.customerId,
        subscriptionId: subscription.subscriptionId.toString(),
        currency: 'USD',
        lines: subscription.billableLineItems.map((line) => ({
          description: line.variantName ? `${line.productName} - ${line.variantName}` : line.productName,
          quantity: line.quantity,
          unitAmount: line.historicalUnitPrice,
          taxId: line.taxId ? line.taxId.toString() : undefined,
          taxRate: line.taxRate
        }))
      }, actorId);
      await service.recordBilling(
        subscription.subscriptionId.toString(),
        { idempotencyKey: billingKey, billedAt: dueAt, externalInvoiceId: invoice.invoiceNumber },
        actorId
      );
      processed += 1;
    } catch (error) {
      console.error(`Billing failed for ${subscription.subscriptionNumber}`, error);
    }
  }

  return processed;
}

async function run() {
  await connectDatabase();
  console.log(`Billing worker polling every ${pollIntervalMs}ms`);
  while (!stopping) {
    try {
      const processed = await processDueBilling();
      if (processed) console.log(`Advanced billing for ${processed} subscription(s)`);
    } catch (error) {
      console.error('Billing worker cycle failed', error);
    }
    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  }
  await mongoose.disconnect();
}

process.on('SIGINT', () => { stopping = true; });
process.on('SIGTERM', () => { stopping = true; });

if (require.main === module) {
  run().catch((error) => {
    console.error('Unable to start billing worker', error);
    process.exitCode = 1;
  });
}

module.exports = { processDueBilling };