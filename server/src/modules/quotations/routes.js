const express = require('express');
const service = require('./service');
const validation = require('./validation');
const {
  identity,
  requireStaffPermission,
  authorizeRead,
  authorizeOwnAction,
  parse,
  asyncRoute,
  roleIsCustomer,
  customerId,
  assertCustomerCanRequest
} = require('../../middleware/access');

const router = express.Router();

router.get('/quotation-templates', requireStaffPermission('quotations:read'), asyncRoute(async (req, res) => {
  res.json(await service.listTemplates(parse(validation.listQuery, req.query)));
}));
router.post('/quotation-templates', requireStaffPermission('quotations:manage'), asyncRoute(async (req, res) => {
  res.status(201).json(await service.createTemplate(parse(validation.templateInput, req.body), identity(req)));
}));
router.get('/quotation-templates/:id', requireStaffPermission('quotations:read'), asyncRoute(async (req, res) => {
  res.json(await service.getTemplate(req.params.id));
}));
router.patch('/quotation-templates/:id', requireStaffPermission('quotations:manage'), asyncRoute(async (req, res) => {
  res.json(await service.updateTemplate(req.params.id, parse(validation.templatePatch, req.body)));
}));
router.delete('/quotation-templates/:id', requireStaffPermission('quotations:manage'), asyncRoute(async (req, res) => {
  res.json(await service.deleteTemplate(req.params.id));
}));

router.get('/quotations', authorizeRead('quotations:read', true), asyncRoute(async (req, res) => {
  const query = parse(validation.listQuery, req.query);
  if (roleIsCustomer(req)) query.customerId = assertCustomerCanRequest(req);
  res.json(await service.listQuotations(query, {
    customerId: roleIsCustomer(req) ? customerId(req) : undefined
  }));
}));
router.post('/quotations', authorizeOwnAction('quotations:manage'), asyncRoute(async (req, res) => {
  const input = parse(validation.quotationInput, req.body);
  if (roleIsCustomer(req)) input.customerId = assertCustomerCanRequest(req, input.customerId);
  res.status(201).json(await service.createQuotation(input, identity(req)));
}));
router.get('/quotations/:id', authorizeRead('quotations:read', true), asyncRoute(async (req, res) => {
  res.json(await service.getQuotation(req.params.id, {
    customerId: roleIsCustomer(req) ? assertCustomerCanRequest(req) : undefined
  }));
}));
router.patch('/quotations/:id', authorizeOwnAction('quotations:manage'), asyncRoute(async (req, res) => {
  res.json(await service.updateQuotation(req.params.id, parse(validation.quotationPatch, req.body), {
    customerId: roleIsCustomer(req) ? customerId(req) : undefined
  }));
}));
router.post('/quotations/:id/confirm', authorizeOwnAction('quotations:confirm'), asyncRoute(async (req, res) => {
  const quotation = await service.getQuotation(req.params.id, {
    customerId: roleIsCustomer(req) ? assertCustomerCanRequest(req) : undefined
  });
  res.json(await service.confirmQuotation(quotation._id, identity(req)));
}));

module.exports = router;
