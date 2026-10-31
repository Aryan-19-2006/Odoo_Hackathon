const { z } = require('zod');
const { objectId, listQuery } = require('../shared/validation');

const invoiceInput = z.object({
  customerId: z.string().trim().min(1).max(160).optional(),
  subscriptionId: objectId.optional(),
  currency: z.string().trim().regex(/^[A-Za-z]{3}$/).default('USD'),
  discountCode: z.string().trim().min(1).max(80).optional(),
  dueAt: z.coerce.date().optional(),
  lines: z.array(z.object({
    description: z.string().trim().min(1).max(250),
    quantity: z.number().int().min(1).max(100000),
    unitAmount: z.number().finite().min(0),
    taxId: objectId.optional()
  })).min(1).max(100)
});

module.exports = { invoiceInput, listQuery };