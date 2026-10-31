const { z } = require('zod');

const taxInput = z.object({
  name: z.string().trim().min(1).max(160),
  rate: z.number().finite().min(0).max(100),
  jurisdiction: z.string().trim().max(160).default(''),
  active: z.boolean().optional()
});

const taxPatch = taxInput.partial().refine((value) => Object.keys(value).length > 0, {
  message: 'At least one field must be provided'
});

module.exports = { taxInput, taxPatch };