const { Payment } = require('./model');
const { Invoice } = require('../invoices/model');
const { ServiceError } = require('../shared/service');

async function createPayment(input, customerId) {
  const existing = await Payment.findOne({ customerId, idempotencyKey: input.idempotencyKey }).lean();
  if (existing) {
    if (existing.invoiceId.toString() !== input.invoiceId) {
      throw new ServiceError(409, 'Idempotency key was already used for another invoice');
    }
    return existing;
  }

  const invoice = await Invoice.findOne({ _id: input.invoiceId, customerId });
  if (!invoice) throw new ServiceError(404, 'Invoice not found');
  if (invoice.status !== 'open') throw new ServiceError(409, 'Only open invoices can be paid');

  try {
    return await new Payment({
      invoiceId: invoice._id,
      customerId,
      amount: invoice.totalAmount,
      currency: invoice.currency,
      status: 'pending',
      idempotencyKey: input.idempotencyKey
    }).save();
  } catch (error) {
    if (error.code !== 11000) throw error;
    const retried = await Payment.findOne({ customerId, idempotencyKey: input.idempotencyKey }).lean();
    if (!retried || retried.invoiceId.toString() !== input.invoiceId) {
      throw new ServiceError(409, 'Idempotency key was already used for another invoice');
    }
    return retried;
  }
}

async function listPayments(query, { customerId } = {}) {
  const filter = customerId ? { customerId } : {};
  if (query.status) filter.status = query.status;
  const skip = (query.page - 1) * query.limit;
  const [results, total] = await Promise.all([
    Payment.find(filter).sort({ createdAt: -1 }).skip(skip).limit(query.limit).lean(),
    Payment.countDocuments(filter)
  ]);
  return { results, pagination: { page: query.page, limit: query.limit, total, pages: Math.ceil(total / query.limit) } };
}

module.exports = { createPayment, listPayments };