const express = require('express');
const service = require('./service');
const validation = require('./validation');
const { identity, requireStaffPermission, authorizeRead, parse, asyncRoute } = require('../../middleware/access');

const router = express.Router();

router.get('/discounts', authorizeRead('discounts:read'), asyncRoute(async (req, res) => {
  const active = req.query.active === undefined ? undefined : req.query.active === 'true';
  res.json(await service.listDiscounts({ active }));
}));
router.post('/discounts', requireStaffPermission('discounts:manage'), asyncRoute(async (req, res) => {
  res.status(201).json(await service.createDiscount(parse(validation.discountInput, req.body), identity(req)));
}));
router.patch('/discounts/:id', requireStaffPermission('discounts:manage'), asyncRoute(async (req, res) => {
  res.json(await service.updateDiscount(req.params.id, parse(validation.discountPatch, req.body)));
}));

module.exports = router;