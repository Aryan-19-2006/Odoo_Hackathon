const { Schema, getModel } = require('../shared/model');

const taxSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 160 },
    rate: { type: Number, required: true, min: 0, max: 100 },
    jurisdiction: { type: String, default: '', trim: true, maxlength: 160 },
    active: { type: Boolean, default: true, index: true },
    createdBy: { type: String, required: true }
  },
  { timestamps: true }
);
taxSchema.index({ name: 1, jurisdiction: 1 }, { unique: true });

module.exports = { TaxRate: getModel('TaxRate', taxSchema) };