const test = require('node:test');
const assert = require('node:assert/strict');
const { addBillingPeriod } = require('../src/modules/subscriptions/billingDates');
const validation = require('../src/modules/shared/validation');
const { createApp } = require('../src/app');
const { requireStaffPermission } = require('../src/middleware/access');

test('daily and weekly billing periods use exact UTC day increments', () => {
  const start = new Date('2024-01-01T10:15:00.000Z');
  assert.equal(addBillingPeriod(start, 'daily').toISOString(), '2024-01-02T10:15:00.000Z');
  assert.equal(addBillingPeriod(start, 'weekly').toISOString(), '2024-01-08T10:15:00.000Z');
});

test('monthly billing clamps to the last day without drifting through overflow', () => {
  const jan31 = new Date('2024-01-31T12:00:00.000Z');
  const feb29 = addBillingPeriod(jan31, 'monthly');
  assert.equal(feb29.toISOString(), '2024-02-29T12:00:00.000Z');
  assert.equal(addBillingPeriod(feb29, 'monthly', jan31).toISOString(), '2024-03-31T12:00:00.000Z');
});

test('yearly billing clamps leap day in a non-leap year', () => {
  assert.equal(
    addBillingPeriod(new Date('2024-02-29T00:00:00.000Z'), 'yearly').toISOString(),
    '2025-02-28T00:00:00.000Z'
  );
});

test('unsupported billing frequencies and invalid dates are rejected', () => {
  assert.throws(() => addBillingPeriod(new Date(), 'hourly'), /Unsupported billing frequency/);
  assert.throws(() => addBillingPeriod(new Date('invalid'), 'daily'), /valid date/);
});

test('plan validation rejects invalid availability and incomplete auto-close settings', () => {
  const validId = '507f1f77bcf86cd799439011';
  const invalidWindow = validation.planInput.safeParse({
    name: 'Monthly',
    frequency: 'monthly',
    productIds: [validId],
    availableFrom: '2025-02-01T00:00:00.000Z',
    availableTo: '2025-01-01T00:00:00.000Z'
  });
  assert.equal(invalidWindow.success, false);

  const incompleteAutoClose = validation.planInput.safeParse({
    name: 'Monthly',
    frequency: 'monthly',
    productIds: [validId],
    autoClose: true
  });
  assert.equal(incompleteAutoClose.success, false);
});

test('optional plan dates and subscription expiry can be explicitly cleared', () => {
  const validId = '507f1f77bcf86cd799439011';
  const planPatch = validation.planPatch.safeParse({ availableTo: null });
  assert.equal(planPatch.success, true);
  assert.equal(planPatch.data.availableTo, null);

  const subscription = validation.subscriptionInput.safeParse({
    customerId: 'customer-1',
    planId: validId,
    expiryDate: null,
    items: [{ productId: validId, quantity: 1 }]
  });
  assert.equal(subscription.success, true);
  assert.equal(subscription.data.expiryDate, null);
});

test('date validation rejects null and non-date values instead of coercing them to epoch', () => {
  const validId = '507f1f77bcf86cd799439011';
  const subscription = validation.subscriptionInput.safeParse({
    customerId: 'customer-1',
    planId: validId,
    startDate: null,
    items: [{ productId: validId, quantity: 1 }]
  });
  assert.equal(subscription.success, false);

  const plan = validation.planInput.safeParse({
    name: 'Monthly',
    frequency: 'monthly',
    productIds: [validId],
    availableFrom: 12345
  });
  assert.equal(plan.success, false);
});

test('subscription validation requires line items and a valid plan reference', () => {
  const result = validation.subscriptionInput.safeParse({
    planId: 'not-an-object-id',
    items: []
  });
  assert.equal(result.success, false);
});

test('product variants accept additive price deltas but reject negative values', () => {
  const base = {
    name: 'Service',
    type: 'software',
    salesPrice: 1000,
    costPrice: 500
  };
  assert.equal(validation.productInput.safeParse({
    ...base,
    variants: [{ name: 'Plus', priceDelta: 560 }]
  }).success, true);
  assert.equal(validation.productInput.safeParse({
    ...base,
    variants: [{ name: 'Invalid', priceDelta: -1 }]
  }).success, false);
});

test('API composition requires authentication middleware and denies unauthenticated requests', async () => {
  assert.throws(() => createApp({}), /authentication middleware must be supplied/i);

  const app = createApp({
    authenticate(req, res) {
      res.status(401).json({ error: 'Unauthenticated' });
    }
  });

  const server = app.listen(0);
  try {
    await new Promise((resolve) => server.once('listening', resolve));
    const response = await fetch(`http://127.0.0.1:${server.address().port}/api/products`);
    assert.equal(response.status, 401);
  } finally {
    server.closeAllConnections();
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }

  const restrictedApp = createApp({
    authenticate(req, res, next) {
      req.user = { id: 'staff-1', role: 'staff', permissions: [] };
      next();
    }
  });

  const restrictedServer = restrictedApp.listen(0);
  try {
    await new Promise((resolve) => restrictedServer.once('listening', resolve));
    const response = await fetch(`http://127.0.0.1:${restrictedServer.address().port}/api/products`);
    assert.equal(response.status, 403);
  } finally {
    restrictedServer.closeAllConnections();
    await new Promise((resolve, reject) => restrictedServer.close((error) => error ? reject(error) : resolve()));
  }
});

test('staff module permissions are enforced independently of the exact staff role label', () => {
  let allowed = false;
  requireStaffPermission('products:manage')(
    { user: { id: 'manager-1', role: 'manager', permissions: ['products:manage'] } },
    {},
    (error) => {
      assert.equal(error, undefined);
      allowed = true;
    }
  );
  assert.equal(allowed, true);

  let deniedStatus;
  requireStaffPermission('products:manage')(
    { user: { id: 'staff-1', role: 'staff', permissions: [] } },
    {},
    (error) => {
      deniedStatus = error.status;
    }
  );
  assert.equal(deniedStatus, 403);
});
