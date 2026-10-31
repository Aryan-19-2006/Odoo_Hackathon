const mongoose = require('mongoose');
const { Invoice } = require('./model');
const { Discount } = require('../discounts/model');
const { TaxRate } = require('../taxes/model');
const { ServiceError, createDocumentNumber, money } = require('../shared/service');

async function createInvoice(input, actorId) {
  if (input.billingKey) {
    const existing = await Invoice.findOne({ billingKey: input.billingKey }).lean();
    if (existing) return existing;
  }

  const session = await mongoose.startSession();
  let invoice;
  try {
    await session.withTransaction(async () => {
      const taxIds = [...new Set(input.lines
        .filter((line) => line.taxRate === undefined)
        .map((line) => line.taxId)
        .filter(Boolean))];
      const taxes = taxIds.length
        ? await TaxRate.find({ _id: { $in: taxIds }, active: true }).session(session).lean()
        : [];
      const taxById = new Map(taxes.map((tax) => [tax._id.toString(), tax]));
      if (taxById.size !== taxIds.length) throw new ServiceError(422, 'One or more tax rates are unavailable');

      const lines = input.lines.map((line) => {
        const taxRate = line.taxRate !== undefined
          ? line.taxRate
          : line.taxId
            ? taxById.get(line.taxId).rate
            : 0;
        const lineSubtotal = money(line.quantity * line.unitAmount);
        const lineTax = money(lineSubtotal * taxRate / 100);
        return {
          ...line,
          taxRate,
          lineSubtotal,
          lineTax,
          lineTotal: money(lineSubtotal + lineTax)
        };
      });

      const subtotal = money(lines.reduce((sum, line) => sum + line.lineSubtotal, 0));
      const taxAmount = money(lines.reduce((sum, line) => sum + line.lineTax, 0));
      let discountAmount = 0;
      let discountId = null;
      if (input.discountCode) {
        const now = new Date();
        const discountFilter = {
          code: input.discountCode.toUpperCase(),
          active: true,
          $and: [
            { $or: [{ validFrom: null }, { validFrom: { $lte: now } }] },
            { $or: [{ validTo: null }, { validTo: { $gt: now } }] },
            {
              $or: [
                { maxRedemptions: null },
                { $expr: { $lt: ['$redemptionCount', '$maxRedemptions'] } }
              ]
            }
          ]
        };
        const discount = await Discount.findOne(discountFilter).session(session).lean();
        if (!discount) throw new ServiceError(422, 'Discount code is not available');
        const redeemed = await Discount.findOneAndUpdate(
          discountFilter,
          { $inc: { redemptionCount: 1 } },
          { new: true, session }
        ).lean();
        if (!redeemed) throw new ServiceError(422, 'Discount code is no longer available');
        discountId = discount._id;
        discountAmount = Math.min(
          subtotal,
          discount.type === 'percentage' ? money(subtotal * discount.value / 100) : discount.value
        );
      }

      invoice = new Invoice({
        invoiceNumber: createDocumentNumber('INV'),
        billingKey: input.billingKey || null,
        customerId: input.customerId,
        subscriptionId: input.subscriptionId || null,
        currency: input.currency.toUpperCase(),
        lines,
        subtotal,
        discountId,
        discountAmount,
        taxAmount,
        totalAmount: money(Math.max(0, subtotal - discountAmount + taxAmount)),
        issuedAt: new Date(),
        dueAt: input.dueAt || null,
        createdBy: actorId
      });
      await invoice.save({ session });
    });
    return invoice;
  } catch (error) {
    if (input.billingKey && error.code === 11000) {
      const existing = await Invoice.findOne({ billingKey: input.billingKey }).lean();
      if (existing) return existing;
    }
    throw error;
  } finally {
    await session.endSession();
  }
}

async function listInvoices(query, { customerId } = {}) {
  const filter = customerId ? { customerId } : {};
  if (query.status) filter.status = query.status;
  const skip = (query.page - 1) * query.limit;
  const [results, total] = await Promise.all([
    Invoice.find(filter).sort({ createdAt: -1 }).skip(skip).limit(query.limit).lean(),
    Invoice.countDocuments(filter)
  ]);
  return { results, pagination: { page: query.page, limit: query.limit, total, pages: Math.ceil(total / query.limit) } };
}

async function getInvoice(id, { customerId } = {}) {
  if (!mongoose.isValidObjectId(id)) throw new ServiceError(404, 'Invoice not found');
  const invoice = await Invoice.findOne({ _id: id, ...(customerId ? { customerId } : {}) }).lean();
  if (!invoice) throw new ServiceError(404, 'Invoice not found');
  return invoice;
}

module.exports = { createInvoice, listInvoices, getInvoice };