const { Discount } = require('./model');
const { ServiceError } = require('../shared/service');

async function listDiscounts({ active } = {}) {
  const filter = active === undefined ? {} : { active };
  return Discount.find(filter).sort({ createdAt: -1 }).lean();
}

async function createDiscount(input, actorId) {
  return new Discount({ ...input, createdBy: actorId }).save();
}

async function updateDiscount(id, input) {
  const discount = await Discount.findById(id);
  if (!discount) throw new ServiceError(404, 'Discount not found');

  const updatedType = input.type ?? discount.type;
  const updatedValue = input.value ?? discount.value;
  if (updatedType === 'percentage' && updatedValue > 100) {
    throw new ServiceError(400, 'Percentage discount cannot exceed 100');
  }
  if (input.maxRedemptions !== undefined && input.maxRedemptions !== null && input.maxRedemptions < discount.redemptionCount) {
    throw new ServiceError(400, 'maxRedemptions cannot be less than the current redemption count');
  }

  Object.assign(discount, input);
  return discount.save();
}

module.exports = { listDiscounts, createDiscount, updateDiscount };