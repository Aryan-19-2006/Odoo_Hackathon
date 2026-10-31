import apiClient from '../../../services/apiClient.js';

const resourcePaths = {
  products: '/products',
  plans: '/plans',
  templates: '/quotation-templates',
  quotations: '/quotations',
};

function assertToken(token) {
  if (typeof token !== 'string' || !token.trim()) {
    throw new Error('A Firebase ID token is required to manage business records.');
  }
}

function requestConfig(token, config = {}) {
  assertToken(token);
  return {
    ...config,
    headers: {
      ...config.headers,
      Authorization: `Bearer ${token}`,
    },
  };
}

export async function listRecords(resource, token, params, signal) {
  const path = resourcePaths[resource];
  if (!path) throw new Error(`No API contract is configured for "${resource}".`);

  const { data } = await apiClient.get(
    path,
    requestConfig(token, { params, signal }),
  );
  if (
    !data ||
    !Array.isArray(data.results) ||
    !data.pagination ||
    !Number.isFinite(data.pagination.total)
  ) {
    throw new Error(`The ${resource} list response is not a paginated result.`);
  }
  return data;
}

export async function getRecord(resource, token, id, signal) {
  const path = resourcePaths[resource];
  if (!path) throw new Error(`No API contract is configured for "${resource}".`);
  if (!id) throw new Error('A record ID is required.');

  const { data } = await apiClient.get(
    `${path}/${encodeURIComponent(id)}`,
    requestConfig(token, { signal }),
  );
  return data;
}

export async function createRecord(resource, token, payload) {
  const path = resourcePaths[resource];
  if (!path) throw new Error(`No API contract is configured for "${resource}".`);
  const { data } = await apiClient.post(path, payload, requestConfig(token));
  return data;
}

export async function updateRecord(resource, token, id, payload) {
  const path = resourcePaths[resource];
  if (!path) throw new Error(`No API contract is configured for "${resource}".`);
  const { data } = await apiClient.patch(
    `${path}/${encodeURIComponent(id)}`,
    payload,
    requestConfig(token),
  );
  return data;
}

export async function archiveRecord(resource, token, id) {
  if (!['products', 'plans', 'templates'].includes(resource)) {
    throw new Error(`The API does not support archiving "${resource}".`);
  }
  const path = resourcePaths[resource];
  if (!path) throw new Error(`No API contract is configured for "${resource}".`);
  const { data } = await apiClient.delete(
    `${path}/${encodeURIComponent(id)}`,
    requestConfig(token),
  );
  return data;
}

export async function confirmQuotation(token, id) {
  const { data } = await apiClient.post(
    `/quotations/${encodeURIComponent(id)}/confirm`,
    {},
    requestConfig(token),
  );
  return data;
}
