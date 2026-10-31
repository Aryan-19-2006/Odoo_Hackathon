const { z } = require('zod');

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Must be a valid MongoDB ID');
const optionalDate = z.coerce.date().optional();
const status = (values) => z.enum(values);

const variantInput = z.object({
  id: objectId.optional(),
  name: z.string().trim().min(1).max(160),
  sku: z.string().trim().min(1).max(80).optional(),
  priceDelta: z.number().finite().min(0).default(0),
  costDelta: z.number().finite().min(0).default(0),
  status: status(['active', 'inactive']).default('active')
});

const productInput = z.object({
  name: z.string().trim().min(1).max(160),
  type: z.string().trim().min(1).max(80),
  salesPrice: z.number().finite().min(0),
  costPrice: z.number().finite().min(0),
  description: z.string().max(4000).optional(),
  status: status(['active', 'inactive', 'archived']).optional(),
  variants: z.array(variantInput).optional()
});

const planInput = z.object({
  name: z.string().trim().min(1).max(160),
  description: z.string().max(4000).optional(),
  frequency: status(['daily', 'weekly', 'monthly', 'yearly']),
  minQuantity: z.number().int().min(1).default(1),
  productIds: z.array(objectId).min(1),
  availableFrom: optionalDate,
  availableTo: optionalDate,
  autoClose: z.boolean().default(false),
  autoCloseAfterCycles: z.number().int().min(1).optional(),
  earlyCloseAllowed: z.boolean().default(false),
  pauseAllowed: z.boolean().default(false),
  renewalAllowed: z.boolean().default(true),
  status: status(['active', 'inactive', 'archived']).optional()
}).refine((value) => !value.availableFrom || !value.availableTo || value.availableTo >= value.availableFrom, {
  message: 'availableTo must be on or after availableFrom',
  path: ['availableTo']
}).refine((value) => !value.autoClose || value.autoCloseAfterCycles !== undefined, {
  message: 'autoCloseAfterCycles is required when autoClose is enabled',
  path: ['autoCloseAfterCycles']
});

const planPatch = z.object({
  name: z.string().trim().min(1).max(160).optional(),
  description: z.string().max(4000).optional(),
  frequency: status(['daily', 'weekly', 'monthly', 'yearly']).optional(),
  minQuantity: z.number().int().min(1).optional(),
  productIds: z.array(objectId).min(1).optional(),
  availableFrom: optionalDate,
  availableTo: optionalDate,
  autoClose: z.boolean().optional(),
  autoCloseAfterCycles: z.number().int().min(1).optional(),
  earlyCloseAllowed: z.boolean().optional(),
  pauseAllowed: z.boolean().optional(),
  renewalAllowed: z.boolean().optional(),
  status: status(['active', 'inactive', 'archived']).optional()
}).refine((value) => Object.keys(value).length > 0, {
  message: 'At least one field must be provided'
});

const lineItemInput = z.object({
  productId: objectId,
  variantId: objectId.optional(),
  quantity: z.number().finite().int().min(1),
  taxId: objectId.optional(),
  taxRate: z.number().finite().min(0).max(100).default(0)
});

const templateInput = z.object({
  name: z.string().trim().min(1).max(160),
  planId: objectId,
  validityDays: z.number().int().min(1).max(3650),
  items: z.array(lineItemInput).min(1),
  notes: z.string().max(4000).optional(),
  status: status(['active', 'inactive']).optional()
});

const quotationInput = z.object({
  templateId: objectId.optional(),
  customerId: z.string().trim().min(1).max(160),
  planId: objectId.optional(),
  validityDays: z.number().int().min(1).max(3650).optional(),
  items: z.array(lineItemInput).min(1).optional(),
  notes: z.string().max(4000).optional(),
  startDate: optionalDate,
  expiryDate: optionalDate,
  paymentTerms: z.string().max(1000).optional()
}).refine((value) => Boolean(value.templateId) || (value.planId && value.items), {
  message: 'Provide a templateId or both planId and items',
  path: ['templateId']
}).refine((value) => !value.startDate || !value.expiryDate || value.expiryDate > value.startDate, {
  message: 'expiryDate must be after startDate',
  path: ['expiryDate']
});

const subscriptionFields = z.object({
  customerId: z.string().trim().min(1).max(160).optional(),
  planId: objectId,
  startDate: optionalDate,
  expiryDate: optionalDate,
  paymentTerms: z.string().max(1000).optional(),
  items: z.array(lineItemInput).min(1),
  taxId: objectId.optional()
});

const subscriptionInput = subscriptionFields.refine(
  (value) => !value.startDate || !value.expiryDate || value.expiryDate > value.startDate,
  {
    message: 'expiryDate must be after startDate',
    path: ['expiryDate']
  }
);

const subscriptionPatch = subscriptionFields.partial().omit({ customerId: true }).refine(
  (value) => Object.keys(value).length > 0,
  { message: 'At least one field must be provided' }
);

const templatePatch = templateInput.partial().refine(
  (value) => Object.keys(value).length > 0,
  { message: 'At least one field must be provided' }
);

const quotationPatch = z.object({
  planId: objectId.optional(),
  validityDays: z.number().int().min(1).max(3650).optional(),
  items: z.array(lineItemInput).min(1).optional(),
  notes: z.string().max(4000).optional()
}).refine((value) => Object.keys(value).length > 0, {
  message: 'At least one field must be provided'
});

const billingRecordInput = z.object({
  idempotencyKey: z.string().trim().min(1).max(200),
  billedAt: optionalDate,
  externalInvoiceId: z.string().trim().max(200).optional()
});

const subscriptionQuoteInput = z.object({
  validityDays: z.number().int().min(1).max(3650).default(30),
  notes: z.string().max(4000).optional()
});

const listQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(160).optional(),
  status: z.string().optional(),
  frequency: status(['daily', 'weekly', 'monthly', 'yearly']).optional(),
  customerId: z.string().trim().max(160).optional(),
  planId: objectId.optional(),
  from: optionalDate,
  to: optionalDate,
  asOf: optionalDate
});

module.exports = {
  objectId,
  productInput,
  planInput,
  planPatch,
  templateInput,
  templatePatch,
  quotationInput,
  quotationPatch,
  subscriptionInput,
  subscriptionPatch,
  billingRecordInput,
  subscriptionQuoteInput,
  listQuery
};
