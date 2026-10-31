const express = require('express');
const service = require('./service');
const validation = require('./validation');
const { identity, requireStaffPermission, authorizeRead, parse, asyncRoute } = require('../../middleware/access');

const router = express.Router();

router.get('/taxes', authorizeRead('taxes:read'), asyncRoute(async (req, res) => {
  const active = req.query.active === undefined ? undefined : req.query.active === 'true';
  res.json(await service.listTaxes({ active }));
}));
router.post('/taxes', requireStaffPermission('taxes:manage'), asyncRoute(async (req, res) => {
  res.status(201).json(await service.createTax(parse(validation.taxInput, req.body), identity(req)));
}));
router.patch('/taxes/:id', requireStaffPermission('taxes:manage'), asyncRoute(async (req, res) => {
  res.json(await service.updateTax(req.params.id, parse(validation.taxPatch, req.body)));
}));

module.exports = router;