const { Schema, getModel } = require('../shared/model');

const paymentSchema = new Schema(
  {
    invoiceId: { type: Schema.Types.ObjectId, ref: 'Invoice', required: true, index: true },
    customerId: { type: String, required: true, index: true },
    amount: { type: Number, required: true, min: 0.01 },
    currency: { type: String, required: true, uppercase: true, minlength: 3, maxlength: 3 },
    status: { type: String, enum: ['pending', 'succeeded', 'failed', 'refunded'], default: 'pending', index: true },
    provider: { type: String, default: 'manual' },
    providerReference: { type: String, default: null },
    idempotencyKey: { type: String, required: true }
  },
  { timestamps: true }
);
paymentSchema.index({ customerId: 1, idempotencyKey: 1 }, { unique: true });

module.exports = { Payment: getModel('Payment', paymentSchema) };