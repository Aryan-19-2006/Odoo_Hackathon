const { Schema, getModel } = require('../shared/model');

const productSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 160 },
    type: { type: String, required: true, trim: true, maxlength: 80 },
    salesPrice: { type: Number, required: true, min: 0 },
    costPrice: { type: Number, required: true, min: 0 },
    description: { type: String, default: '', maxlength: 4000 },
    status: { type: String, enum: ['active', 'inactive', 'archived'], default: 'active' }
  },
  { timestamps: true }
);
productSchema.index({ status: 1, name: 1 });

const productVariantSchema = new Schema(
  {
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 160 },
    sku: { type: String, trim: true, uppercase: true, maxlength: 80 },
    priceDelta: { type: Number, required: true, min: 0, default: 0 },
    costDelta: { type: Number, required: true, min: 0, default: 0 },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' }
  },
  { timestamps: true }
);
productVariantSchema.index(
  { product: 1, sku: 1 },
  { unique: true, partialFilterExpression: { sku: { $type: 'string' } } }
);

module.exports = {
  Product: getModel('Product', productSchema),
  ProductVariant: getModel('ProductVariant', productVariantSchema)
};
