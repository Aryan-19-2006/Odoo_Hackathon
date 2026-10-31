const { Schema, getModel } = require('../shared/model');

const planSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 160 },
    description: { type: String, default: '', maxlength: 4000 },
    frequency: { type: String, enum: ['daily', 'weekly', 'monthly', 'yearly'], required: true },
    minQuantity: { type: Number, required: true, min: 1, default: 1 },
    productIds: [{ type: Schema.Types.ObjectId, ref: 'Product', required: true }],
    availableFrom: { type: Date },
    availableTo: { type: Date },
    autoClose: { type: Boolean, default: false },
    autoCloseAfterCycles: { type: Number, min: 1 },
    earlyCloseAllowed: { type: Boolean, default: false },
    pauseAllowed: { type: Boolean, default: false },
    renewalAllowed: { type: Boolean, default: true },
    status: { type: String, enum: ['active', 'inactive', 'archived'], default: 'active' }
  },
  { timestamps: true }
);
planSchema.index({ status: 1, frequency: 1, availableFrom: 1, availableTo: 1 });

module.exports = { Plan: getModel('Plan', planSchema) };
