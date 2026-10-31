const { z } = require('zod');

const discountFields = z.object({
  code: z.string().trim().min(1).max(80).regex(/^[A-Za-z0-9_-]+$/),
  name: z.string().trim().min(1).max(160),
  type: z.enum(['percentage', 'fixed']),
  value: z.number().finite().positive(),
  validFrom: z.coerce.date().optional(),
  validTo: z.coerce.date().optional(),
  maxRedemptions: z.number().int().positive().nullable().optional(),
  active: z.boolean().optional()
});

const discountInput = discountFields.refine((value) => value.type !== 'percentage' || value.value <= 100, {
  message: 'Percentage discount cannot exceed 100',
  path: ['value']
}).refine((value) => !value.validFrom || !value.validTo || value.validTo > value.validFrom, {
  message: 'validTo must be after validFrom',
  path: ['validTo']
});

const discountPatch = discountFields.partial().refine((value) => Object.keys(value).length > 0, {
  message: 'At least one field must be provided'
}).refine((value) => value.type !== 'percentage' || value.value === undefined || value.value <= 100, {
  message: 'Percentage discount cannot exceed 100',
  path: ['value']
}).refine((value) => !value.validFrom || !value.validTo || value.validTo > value.validFrom, {
  message: 'validTo must be after validFrom',
  path: ['validTo']
});

module.exports = { discountInput, discountPatch };