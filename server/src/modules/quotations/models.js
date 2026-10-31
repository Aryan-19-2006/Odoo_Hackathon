const { Schema, getModel } = require('../shared/model');

const quotationLineSchema = new Schema(
  {
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    variantId: { type: Schema.Types.ObjectId, ref: 'ProductVariant', default: null },
    productName: { type: String, required: true },
    variantName: { type: String, default: null },
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
    taxId: { type: Schema.Types.ObjectId, default: null },
    taxRate: { type: Number, min: 0, max: 100, default: 0 },
    taxAmount: { type: Number, min: 0, default: 0 },
    lineTotal: { type: Number, required: true, min: 0 }
  },
  { _id: true }
);

const quotationTemplateSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 160 },
    planId: { type: Schema.Types.ObjectId, ref: 'Plan', required: true },
    validityDays: { type: Number, required: true, min: 1, max: 3650 },
    items: { type: [quotationLineSchema], required: true, validate: [(items) => items.length > 0, 'At least one item is required'] },
    totalAmount: { type: Number, required: true, min: 0 },
    notes: { type: String, default: '', maxlength: 4000 },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
    createdBy: { type: String, required: true }
  },
  { timestamps: true }
);
quotationTemplateSchema.index({ status: 1, name: 1 });

const quotationSchema = new Schema(
  {
    quotationNumber: { type: String, required: true, unique: true, index: true },
    templateId: { type: Schema.Types.ObjectId, ref: 'QuotationTemplate', default: null },
    customerId: { type: String, required: true, index: true },
    planId: { type: Schema.Types.ObjectId, ref: 'Plan', required: true },
    items: { type: [quotationLineSchema], required: true },
    totalAmount: { type: Number, required: true, min: 0 },
    notes: { type: String, default: '', maxlength: 4000 },
    issuedAt: { type: Date, required: true },
    expiresAt: { type: Date, required: true, index: true },
    status: { type: String, enum: ['quotation', 'confirmed', 'expired', 'cancelled'], default: 'quotation', index: true },
    subscriptionId: { type: Schema.Types.ObjectId, ref: 'Subscription', default: null },
    createdBy: { type: String, required: true },
    confirmedAt: { type: Date, default: null }
  },
  { timestamps: true }
);
quotationSchema.index({ customerId: 1, status: 1, createdAt: -1 });

module.exports = {
  QuotationTemplate: getModel('QuotationTemplate', quotationTemplateSchema),
  Quotation: getModel('Quotation', quotationSchema)
};
