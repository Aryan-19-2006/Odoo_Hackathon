const { Schema, getModel } = require('../shared/model');

const subscriptionSchema = new Schema(
  {
    subscriptionNumber: { type: String, required: true, unique: true, index: true },
    customerId: { type: String, required: true, index: true },
    planId: { type: Schema.Types.ObjectId, ref: 'Plan', required: true },
    quotationId: { type: Schema.Types.ObjectId, ref: 'Quotation', default: null },
    startDate: { type: Date, required: true },
    billingAnchorDate: {
      type: Date,
      required: true,
      default() {
        return this.startDate;
      }
    },
    expiryDate: { type: Date, default: null },
    paymentTerms: { type: String, default: '', maxlength: 1000 },
    totalAmount: { type: Number, required: true, min: 0 },
    nextBillingDate: { type: Date, required: true, index: true },
    billingCycles: { type: Number, min: 0, default: 0 },
    status: {
      type: String,
      enum: ['draft', 'quotation', 'confirmed', 'active', 'paused', 'closed', 'expired'],
      default: 'draft',
      index: true
    },
    pausedAt: { type: Date, default: null },
    closedAt: { type: Date, default: null },
    taxId: { type: Schema.Types.ObjectId, default: null }
  },
  { timestamps: true }
);
subscriptionSchema.index({ status: 1, nextBillingDate: 1, expiryDate: 1 });
subscriptionSchema.index({ customerId: 1, status: 1, createdAt: -1 });

const subscriptionItemSchema = new Schema(
  {
    subscriptionId: { type: Schema.Types.ObjectId, ref: 'Subscription', required: true, index: true },
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
  { timestamps: true }
);
subscriptionItemSchema.index({ subscriptionId: 1, productId: 1 });

const subscriptionHistorySchema = new Schema(
  {
    subscriptionId: { type: Schema.Types.ObjectId, ref: 'Subscription', required: true, index: true },
    action: { type: String, required: true },
    fromStatus: { type: String, default: null },
    toStatus: { type: String, default: null },
    actorId: { type: String, required: true },
    details: { type: Schema.Types.Mixed, default: {} }
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);
subscriptionHistorySchema.index({ subscriptionId: 1, createdAt: -1 });

const billingEventSchema = new Schema(
  {
    subscriptionId: { type: Schema.Types.ObjectId, ref: 'Subscription', required: true, index: true },
    idempotencyKey: { type: String, required: true },
    externalInvoiceId: { type: String, default: null },
    billedAt: { type: Date, required: true },
    periodStart: { type: Date, required: true },
    periodEnd: { type: Date, required: true }
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);
billingEventSchema.index({ subscriptionId: 1, idempotencyKey: 1 }, { unique: true });

module.exports = {
  Subscription: getModel('Subscription', subscriptionSchema),
  SubscriptionItem: getModel('SubscriptionItem', subscriptionItemSchema),
  SubscriptionHistory: getModel('SubscriptionHistory', subscriptionHistorySchema),
  SubscriptionBillingEvent: getModel('SubscriptionBillingEvent', billingEventSchema)
};
