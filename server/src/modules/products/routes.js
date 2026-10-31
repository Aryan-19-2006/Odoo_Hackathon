const express = require('express');
const service = require('./service');
const validation = require('./validation');
const {
  requireStaffPermission,
  authorizeCatalogRead,
  parse,
  asyncRoute,
  roleIsCustomer
} = require('../../middleware/access');

const router = express.Router();

router.get('/products', authorizeCatalogRead('products:read'), asyncRoute(async (req, res) => {
  const query = parse(validation.listQuery, req.query);
  res.json(await service.listProducts(query, { customer: roleIsCustomer(req) }));
}));
router.post('/products', requireStaffPermission('products:manage'), asyncRoute(async (req, res) => {
  res.status(201).json(await service.createProduct(parse(validation.productInput, req.body)));
}));
router.get('/products/:id', authorizeCatalogRead('products:read'), asyncRoute(async (req, res) => {
  res.json(await service.getProduct(req.params.id, { customer: roleIsCustomer(req) }));
}));
router.patch('/products/:id', requireStaffPermission('products:manage'), asyncRoute(async (req, res) => {
  const schema = validation.productInput.partial().refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field must be provided'
  });
  res.json(await service.updateProduct(req.params.id, parse(schema, req.body)));
}));
router.delete('/products/:id', requireStaffPermission('products:manage'), asyncRoute(async (req, res) => {
  res.json(await service.deleteProduct(req.params.id));
}));

module.exports = router;
