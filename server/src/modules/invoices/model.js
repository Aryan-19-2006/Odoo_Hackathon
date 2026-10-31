const { Schema, getModel } = require('../shared/model');

const invoiceLineSchema = new Schema(
  {
    description: { type: String, required: true, trim: true, maxlength: 250 },
    quantity: { type: Number, required: true, min: 1 },
    unitAmount: { type: Number, required: true, min: 0 },
    taxRate: { type: Number, required: true, min: 0, max: 100 },
    lineSubtotal: { type: Number, required: true, min: 0 },
    lineTax: { type: Number, required: true, min: 0 },
    lineTotal: { type: Number, required: true, min: 0 }
  },
  { _id: false }
);

const invoiceSchema = new Schema(
  {
    invoiceNumber: { type: String, required: true, unique: true, index: true },
    billingKey: { type: String, default: null, unique: true, sparse: true },
    customerId: { type: String, required: true, index: true },
    subscriptionId: { type: Schema.Types.ObjectId, ref: 'Subscription', default: null, index: true },
    currency: { type: String, required: true, uppercase: true, minlength: 3, maxlength: 3 },
    lines: { type: [invoiceLineSchema], required: true },
    subtotal: { type: Number, required: true, min: 0 },
    discountId: { type: Schema.Types.ObjectId, ref: 'Discount', default: null },
    discountAmount: { type: Number, required: true, min: 0, default: 0 },
    taxAmount: { type: Number, required: true, min: 0, default: 0 },
    totalAmount: { type: Number, required: true, min: 0 },
    status: { type: String, enum: ['open', 'paid', 'void'], default: 'open', index: true },
    issuedAt: { type: Date, required: true, default: Date.now },
    dueAt: { type: Date, default: null },
    createdBy: { type: String, required: true }
  },
  { timestamps: true }
);
invoiceSchema.index({ customerId: 1, createdAt: -1 });

module.exports = { Invoice: getModel('Invoice', invoiceSchema) };