const express = require('express');
const service = require('./service');
const validation = require('./validation');
const {
  ServiceError
} = require('../shared/service');
const {
  identity,
  requirePermission,
  authorizeRead,
  authorizeOwnAction,
  parse,
  asyncRoute,
  roleIsCustomer,
  assertCustomerCanRequest
} = require('../../middleware/access');

const router = express.Router();

router.get('/subscriptions/due-for-billing', requirePermission('subscriptions:billing:read'), asyncRoute(async (req, res) => {
  res.json(await service.listDueForBilling(parse(validation.listQuery, req.query)));
}));
router.post('/subscriptions/:id/record-billing', requirePermission('subscriptions:billing:write'), asyncRoute(async (req, res) => {
  res.json(await service.recordBilling(
    req.params.id,
    parse(validation.billingRecordInput, req.body),
    identity(req)
  ));
}));
router.get('/subscriptions', authorizeRead('subscriptions:read', true), asyncRoute(async (req, res) => {
  const query = parse(validation.listQuery, req.query);
  if (roleIsCustomer(req)) query.customerId = assertCustomerCanRequest(req);
  res.json(await service.listSubscriptions(query, {
    customerId: roleIsCustomer(req) ? assertCustomerCanRequest(req) : undefined
  }));
}));
router.post('/subscriptions', authorizeOwnAction('subscriptions:create'), asyncRoute(async (req, res) => {
  const input = parse(validation.subscriptionInput, req.body);
  input.customerId = assertCustomerCanRequest(req, input.customerId);
  if (!input.customerId) throw new ServiceError(400, 'customerId is required for staff-created subscriptions');
  res.status(201).json(await service.createSubscription(input, identity(req)));
}));
router.post('/subscriptions/:id/quotation', authorizeOwnAction('subscriptions:update'), asyncRoute(async (req, res) => {
  res.status(201).json(await service.createQuotationFromSubscription(
    req.params.id,
    parse(validation.subscriptionQuoteInput, req.body || {}),
    identity(req)
  ));
}));
router.get('/subscriptions/:id/history', authorizeRead('subscriptions:read', true), asyncRoute(async (req, res) => {
  res.json(await service.getSubscriptionHistory(req.params.id, {
    ...(roleIsCustomer(req) ? { customerId: assertCustomerCanRequest(req) } : {})
  }));
}));
router.get('/subscriptions/:id', authorizeRead('subscriptions:read', true), asyncRoute(async (req, res) => {
  res.json(await service.getSubscriptionDocument(req.params.id, {
    ...(roleIsCustomer(req) ? { customerId: assertCustomerCanRequest(req) } : {})
  }));
}));
router.patch('/subscriptions/:id', authorizeOwnAction('subscriptions:update'), asyncRoute(async (req, res) => {
  res.json(await service.updateSubscription(req.params.id, parse(validation.subscriptionPatch, req.body), {
    customerId: roleIsCustomer(req) ? assertCustomerCanRequest(req) : undefined,
    actorId: identity(req)
  }));
}));

for (const action of ['activate', 'pause', 'resume', 'renew', 'close']) {
  router.post(`/subscriptions/:id/${action}`, authorizeOwnAction(`subscriptions:${action}`), asyncRoute(async (req, res) => {
    res.json(await service.transitionSubscription(req.params.id, action, identity(req), {
      customerId: roleIsCustomer(req) ? assertCustomerCanRequest(req) : undefined
    }));
  }));
}

module.exports = router;
