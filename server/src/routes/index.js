const express = require('express');
const productsRoutes = require('../modules/products/routes');
const plansRoutes = require('../modules/plans/routes');
const quotationsRoutes = require('../modules/quotations/routes');
const subscriptionsRoutes = require('../modules/subscriptions/routes');
const { authenticated } = require('../middleware/access');

function createApiRouter({ authenticate }) {
  if (typeof authenticate !== 'function') {
    throw new TypeError('Member 1 authentication middleware must be supplied');
  }

  const router = express.Router();
  router.use(authenticate, authenticated);
  router.use(productsRoutes);
  router.use(plansRoutes);
  router.use(quotationsRoutes);
  router.use(subscriptionsRoutes);
  return router;
}

module.exports = { createApiRouter };
