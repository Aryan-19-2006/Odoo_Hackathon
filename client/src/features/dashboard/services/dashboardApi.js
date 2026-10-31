import apiClient from '../../../services/apiClient.js';

const resourcePaths = {
  products: '/products',
  plans: '/plans',
  quotations: '/quotations',
  subscriptions: '/subscriptions',
};

export class DashboardApiError extends Error {
  constructor(message) {
    super(message);
    this.name = 'DashboardApiError';
  }
}

export async function listDashboardResource(resource, { token, params, signal }) {
  const path = resourcePaths[resource];
  if (!path) {
    throw new DashboardApiError(`No confirmed API contract exists for "${resource}".`);
  }
  if (typeof token !== 'string' || !token.trim()) {
    throw new DashboardApiError('A Firebase ID token is required to load dashboard data.');
  }

  const response = await apiClient.get(path, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    params,
    signal,
  });

  const payload = response.data;
  if (
    !payload ||
    !Array.isArray(payload.results) ||
    !payload.pagination ||
    !Number.isFinite(payload.pagination.total)
  ) {
    throw new DashboardApiError(
      `The ${resource} API response did not match the documented paginated response.`,
    );
  }

  return payload;
}

export async function getDashboardAccessToken(getIdToken) {
  if (typeof getIdToken !== 'function') {
    throw new DashboardApiError(
      'Authentication is not connected. Provide Member 1’s Firebase ID token getter to load protected dashboard data.',
    );
  }

  const token = await getIdToken();
  if (typeof token !== 'string' || !token.trim()) {
    throw new DashboardApiError('Firebase did not provide an ID token for this session.');
  }
  return token;
}
