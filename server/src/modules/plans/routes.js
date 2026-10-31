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

router.get('/plans', authorizeCatalogRead('plans:read'), asyncRoute(async (req, res) => {
  const query = parse(validation.listQuery, req.query);
  res.json(await service.listPlans(query, { customer: roleIsCustomer(req) }));
}));
router.post('/plans', requireStaffPermission('plans:manage'), asyncRoute(async (req, res) => {
  res.status(201).json(await service.createPlan(parse(validation.planInput, req.body)));
}));
router.get('/plans/:id', authorizeCatalogRead('plans:read'), asyncRoute(async (req, res) => {
  res.json(await service.getPlan(req.params.id, { customer: roleIsCustomer(req) }));
}));
router.patch('/plans/:id', requireStaffPermission('plans:manage'), asyncRoute(async (req, res) => {
  res.json(await service.updatePlan(req.params.id, parse(validation.planPatch, req.body)));
}));
router.delete('/plans/:id', requireStaffPermission('plans:manage'), asyncRoute(async (req, res) => {
  res.json(await service.deletePlan(req.params.id));
}));

module.exports = router;
