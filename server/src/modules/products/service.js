const service = require('../shared/service');

module.exports = {
  listProducts: service.listProducts,
  getProduct: service.getProduct,
  createProduct: service.createProduct,
  updateProduct: service.updateProduct,
  deleteProduct: service.deleteProduct
};
