const { Schema, getModel } = require('../shared/model');

const discountSchema = new Schema(
  {
    code: { type: String, required: true, unique: true, trim: true, uppercase: true, maxlength: 80 },
    name: { type: String, required: true, trim: true, maxlength: 160 },
    type: { type: String, enum: ['percentage', 'fixed'], required: true },
    value: { type: Number, required: true, min: 0 },
    active: { type: Boolean, default: true, index: true },
    validFrom: { type: Date, default: null },
    validTo: { type: Date, default: null },
    maxRedemptions: { type: Number, default: null, min: 1 },
    redemptionCount: { type: Number, default: 0, min: 0 },
    createdBy: { type: String, required: true }
  },
  { timestamps: true }
);

module.exports = { Discount: getModel('Discount', discountSchema) };