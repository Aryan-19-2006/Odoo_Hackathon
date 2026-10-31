const express = require('express');
const service = require('./service');
const validation = require('./validation');
const {
  identity,
  requireStaffPermission,
  authorizeRead,
  parse,
  asyncRoute,
  roleIsCustomer,
  assertCustomerCanRequest
} = require('../../middleware/access');

const router = express.Router();

router.get('/invoices', authorizeRead('invoices:read', true), asyncRoute(async (req, res) => {
  const query = parse(validation.listQuery, req.query);
  res.json(await service.listInvoices(query, {
    customerId: roleIsCustomer(req) ? assertCustomerCanRequest(req) : query.customerId
  }));
}));
router.post('/invoices', requireStaffPermission('invoices:manage'), asyncRoute(async (req, res) => {
  const input = parse(validation.invoiceInput, req.body);
  if (!input.customerId) {
    const error = new Error('customerId is required');
    error.status = 400;
    throw error;
  }
  res.status(201).json(await service.createInvoice(input, identity(req)));
}));
router.get('/invoices/:id', authorizeRead('invoices:read', true), asyncRoute(async (req, res) => {
  res.json(await service.getInvoice(req.params.id, {
    customerId: roleIsCustomer(req) ? assertCustomerCanRequest(req) : undefined
  }));
}));

module.exports = router;