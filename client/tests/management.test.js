import assert from 'node:assert/strict';
import { after, before, beforeEach, test } from 'node:test';
import { resolve } from 'node:path';
import { createServer } from 'vite';

let server;
let apiClient;
let api;
let buildPayload;
let initialValues;
let definitions;
let permissions;
const calls = [];
const token = 'firebase-test-token';
const id = '64b000000000000000000001';

before(async () => {
  server = await createServer({
    appType: 'custom',
    configFile: resolve(process.cwd(), 'vite.config.js'),
    server: { middlewareMode: true },
  });
  ({ default: apiClient } = await server.ssrLoadModule('/src/services/apiClient.js'));
  api = await server.ssrLoadModule(
    '/src/features/management/services/managementApi.js',
  );
  ({ buildPayload, initialValues } = await server.ssrLoadModule(
    '/src/features/management/components/RecordForm.jsx',
  ));
  definitions = await server.ssrLoadModule(
    '/src/features/management/definitions.js',
  );
  permissions = await server.ssrLoadModule(
    '/src/features/management/utils/permissions.js',
  );
});

after(async () => {
  await server?.close();
});

beforeEach(() => {
  calls.length = 0;
  apiClient.get = async (...args) => {
    calls.push(['GET', ...args]);
    return {
      data: {
        results: [],
        pagination: { page: 1, limit: 20, total: 0, pages: 0 },
      },
    };
  };
  apiClient.post = async (...args) => {
    calls.push(['POST', ...args]);
    return { data: { _id: id } };
  };
  apiClient.patch = async (...args) => {
    calls.push(['PATCH', ...args]);
    return { data: { _id: id } };
  };
  apiClient.delete = async (...args) => {
    calls.push(['DELETE', ...args]);
    return { data: { _id: id } };
  };
});

test('list and detail requests use documented resources, filters, and bearer auth', async () => {
  const list = await api.listRecords(
    'products',
    token,
    { page: 2, limit: 20, search: 'annual', status: 'active' },
  );
  assert.equal(list.pagination.total, 0);
  assert.equal(calls[0][0], 'GET');
  assert.equal(calls[0][1], '/products');
  assert.deepEqual(calls[0][2], {
    headers: { Authorization: `Bearer ${token}` },
    params: { page: 2, limit: 20, search: 'annual', status: 'active' },
    signal: undefined,
  });

  await api.getRecord('plans', token, id);
  assert.equal(calls[1][1], `/plans/${id}`);
  assert.equal(calls[1][2].headers.Authorization, `Bearer ${token}`);
});

test('product, plan, and template CRUD methods map to their confirmed API verbs', async () => {
  const product = { name: 'Annual service' };
  await api.createRecord('products', token, product);
  await api.updateRecord('plans', token, id, { name: 'Annual plan' });
  await api.archiveRecord('templates', token, id);

  assert.deepEqual(calls.map(([method, path]) => [method, path]), [
    ['POST', '/products'],
    ['PATCH', `/plans/${id}`],
    ['DELETE', `/quotation-templates/${id}`],
  ]);
  assert.equal(calls[0][2], product);
  assert.equal(calls[0][3].headers.Authorization, `Bearer ${token}`);
});

test('quotation workflow supports create, update, and confirm but no delete', async () => {
  await api.createRecord('quotations', token, { customerId: 'customer-1' });
  await api.updateRecord('quotations', token, id, { notes: 'Updated' });
  await api.confirmQuotation(token, id);

  assert.deepEqual(calls.map(([method, path]) => [method, path]), [
    ['POST', '/quotations'],
    ['PATCH', `/quotations/${id}`],
    ['POST', `/quotations/${id}/confirm`],
  ]);
  await assert.rejects(api.archiveRecord('quotations', token, id), /does not support archiving/);
  assert.equal(calls.length, 3);
});

test('protected requests reject missing tokens and malformed paginated responses', async () => {
  await assert.rejects(api.listRecords('products', '', {}), /Firebase ID token/);
  apiClient.get = async () => ({ data: { results: [] } });
  await assert.rejects(
    api.listRecords('products', token, {}),
    /not a paginated result/,
  );
  await assert.rejects(
    api.listRecords('users', token, {}),
    /No API contract/,
  );
});

test('product forms submit server-supported product and nested variant fields only', () => {
  const payload = buildPayload('products', {
    name: '  Product ',
    type: 'service',
    salesPrice: '20.5',
    costPrice: '12',
    description: 'Details',
    status: 'active',
    variants: [{
      id,
      name: 'Premium',
      sku: 'sku-1',
      priceDelta: '4',
      costDelta: '2',
      status: 'active',
    }],
  });
  assert.deepEqual(payload, {
    name: 'Product',
    type: 'service',
    salesPrice: 20.5,
    costPrice: 12,
    description: 'Details',
    status: 'active',
    variants: [{
      id,
      name: 'Premium',
      sku: 'sku-1',
      priceDelta: 4,
      costDelta: 2,
      status: 'active',
    }],
  });
});

test('plan and quotation forms validate and keep server-managed prices out of requests', () => {
  const plan = buildPayload('plans', {
    name: 'Monthly',
    description: '',
    frequency: 'monthly',
    minQuantity: '1',
    productIds: [id],
    availableFrom: '',
    availableTo: '',
    autoClose: true,
    autoCloseAfterCycles: '12',
    earlyCloseAllowed: false,
    pauseAllowed: true,
    renewalAllowed: true,
    status: 'active',
  });
  assert.equal(plan.availableFrom, null);
  assert.equal(plan.availableTo, null);
  assert.equal(plan.autoCloseAfterCycles, 12);

  const quotation = buildPayload('quotations', {
    customerId: 'customer-1',
    templateId: '',
    planId: id,
    validityDays: '30',
    items: [{
      productId: id,
      variantId: '',
      quantity: '2',
      taxId: '',
      taxRate: '5',
      unitPrice: 999,
    }],
    notes: '',
    startDate: '',
    expiryDate: '',
    paymentTerms: '',
  });
  assert.deepEqual(quotation.items, [{
    productId: id,
    quantity: 2,
    taxRate: 5,
  }]);
  assert.equal('unitPrice' in quotation.items[0], false);
  assert.throws(
    () => buildPayload('plans', {
      name: 'Invalid',
      frequency: 'monthly',
      minQuantity: '1',
      productIds: [id],
      autoClose: true,
      autoCloseAfterCycles: '',
    }),
    /Auto-close cycles/,
  );
});

test('quotation edit forms are populated from the saved API record', () => {
  const formValues = initialValues('quotations', {
    customerId: 'customer-1',
    planId: id,
    issuedAt: '2026-01-01T00:00:00.000Z',
    expiresAt: '2026-01-31T00:00:00.000Z',
    notes: 'Existing note',
    items: [{
      productId: id,
      variantId: null,
      quantity: 2,
      taxId: null,
      taxRate: 5,
      unitPrice: 20,
    }],
  });
  assert.equal(formValues.planId, id);
  assert.equal(formValues.validityDays, 30);
  assert.equal(formValues.items[0].productId, id);
  assert.equal(formValues.items[0].quantity, '2');
  assert.equal(formValues.notes, 'Existing note');
});

test('module definitions and customer routes reflect the available API scope', () => {
  assert.deepEqual(Object.keys(definitions.moduleDefinitions).sort(), [
    'plans',
    'products',
    'quotation-templates',
    'quotations',
    'variants',
  ]);
  assert.equal(
    permissions.canReadManagementModule(
      { role: 'customer', permissions: [] },
      definitions.moduleDefinitions.quotations,
      'quotations',
    ),
    true,
  );
  assert.equal(
    permissions.canReadManagementModule(
      { role: 'customer', permissions: [] },
      definitions.moduleDefinitions.variants,
      'variants',
    ),
    true,
  );
  assert.equal(
    permissions.canReadManagementModule(
      { role: 'customer', permissions: [] },
      definitions.moduleDefinitions['quotation-templates'],
      'quotation-templates',
    ),
    false,
  );
});
