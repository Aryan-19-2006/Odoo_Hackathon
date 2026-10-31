const express = require('express');
const service = require('./service');
const validation = require('./validation');
const {
  identity,
  authorizeRead,
  authorizeOwnAction,
  parse,
  asyncRoute,
  roleIsCustomer,
  assertCustomerCanRequest
} = require('../../middleware/access');

const router = express.Router();

router.get('/payments', authorizeRead('payments:read', true), asyncRoute(async (req, res) => {
  const query = parse(validation.listQuery, req.query);
  res.json(await service.listPayments(query, {
    customerId: roleIsCustomer(req) ? assertCustomerCanRequest(req) : query.customerId
  }));
}));
router.post('/payments', authorizeOwnAction('payments:create'), asyncRoute(async (req, res) => {
  const input = parse(validation.paymentInput, req.body);
  const customerId = assertCustomerCanRequest(req, req.body.customerId);
  if (!customerId) {
    const error = new Error('customerId is required');
    error.status = 400;
    throw error;
  }
  const payment = await service.createPayment(input, customerId);
  res.status(201).json(payment);
}));

module.exports = router;