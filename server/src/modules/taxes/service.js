const { TaxRate } = require('./model');
const { ServiceError } = require('../shared/service');

async function listTaxes({ active } = {}) {
  const filter = active === undefined ? {} : { active };
  return TaxRate.find(filter).sort({ name: 1 }).lean();
}

async function createTax(input, actorId) {
  return new TaxRate({ ...input, createdBy: actorId }).save();
}

async function updateTax(id, input) {
  const tax = await TaxRate.findByIdAndUpdate(id, input, { new: true, runValidators: true });
  if (!tax) throw new ServiceError(404, 'Tax rate not found');
  return tax;
}

module.exports = { listTaxes, createTax, updateTax };