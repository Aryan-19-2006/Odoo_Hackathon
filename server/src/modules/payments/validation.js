const { z } = require('zod');
const { objectId, listQuery } = require('../shared/validation');

const paymentInput = z.object({
  invoiceId: objectId,
  idempotencyKey: z.string().trim().min(1).max(200)
});

module.exports = { paymentInput, listQuery };