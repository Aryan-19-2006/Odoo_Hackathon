import { getDashboardAccessToken, listDashboardResource } from './dashboardApi.js';

export const SUBSCRIPTION_STATUSES = [
  'draft',
  'quotation',
  'confirmed',
  'active',
  'paused',
  'closed',
  'expired',
];

function inclusiveUtcEndOfDay(date) {
  if (!date) return undefined;
  const parsed = new Date(`${date}T23:59:59.999Z`);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
}

const staffResources = [
  { resource: 'products', permission: 'products:read' },
  { resource: 'plans', permission: 'plans:read' },
  { resource: 'quotations', permission: 'quotations:read' },
  { resource: 'subscriptions', permission: 'subscriptions:read' },
];

function isAllowed(user, permission) {
  return (
    user.role === 'admin' ||
    user.permissions?.includes('*') ||
    user.permissions?.includes(permission)
  );
}

async function attempt(callback) {
  try {
    return { status: 'success', data: await callback() };
  } catch (error) {
    if (error?.name === 'CanceledError' || error?.code === 'ERR_CANCELED') {
      throw error;
    }
    return { status: 'error', error };
  }
}

export async function loadAdminDashboard({ dateRange, getIdToken, signal }) {
  const token = await getDashboardAccessToken(getIdToken);
  const dateFilters = {
    ...(dateRange.from ? { from: dateRange.from } : {}),
    ...(dateRange.to
      ? { to: inclusiveUtcEndOfDay(dateRange.to) }
      : {}),
  };
  const requests = [
    attempt(() =>
      listDashboardResource('subscriptions', {
        token,
        params: { page: 1, limit: 5, ...dateFilters },
        signal,
      }),
    ),
    attempt(() =>
      listDashboardResource('subscriptions', {
        token,
        params: { page: 1, limit: 1, status: 'active', ...dateFilters },
        signal,
      }),
    ),
    ...SUBSCRIPTION_STATUSES.map((status) =>
      attempt(() =>
        listDashboardResource('subscriptions', {
          token,
          params: { page: 1, limit: 1, status, ...dateFilters },
          signal,
        }),
      ),
    ),
  ];
  const [
    recentSubscriptions,
    activeSubscriptions,
    ...statusResponses
  ] = await Promise.all(requests);

  return {
    recentSubscriptions,
    activeSubscriptions,
    subscriptionStatuses: statusResponses.map((result, index) =>
      result.status === 'success'
        ? {
            status: SUBSCRIPTION_STATUSES[index],
            count: result.data.pagination.total,
          }
        : result,
    ),
  };
}

export async function loadStaffDashboard({ getIdToken, signal, user }) {
  const allowedResources = staffResources.filter(({ permission }) =>
    isAllowed(user, permission),
  );
  if (allowedResources.length === 0) {
    return { resources: [], hasAccess: false };
  }

  const token = await getDashboardAccessToken(getIdToken);
  const results = await Promise.all(
    allowedResources.map(async ({ resource, permission }) => ({
      resource,
      permission,
      result: await attempt(() =>
        listDashboardResource(resource, {
          token,
          params: { page: 1, limit: 1 },
          signal,
        }),
      ),
    })),
  );
  return { resources: results, hasAccess: true };
}

export async function loadCustomerDashboard({ getIdToken, page, signal }) {
  const token = await getDashboardAccessToken(getIdToken);
  // The backend scopes customer subscription lists to the authenticated customer.
  const [activeSubscriptions, recentSubscriptions] = await Promise.all([
    attempt(() =>
      listDashboardResource('subscriptions', {
        token,
        params: { page: 1, limit: 100, status: 'active' },
        signal,
      }),
    ),
    attempt(() =>
      listDashboardResource('subscriptions', {
        token,
        params: { page, limit: 10 },
        signal,
      }),
    ),
  ]);
  return { activeSubscriptions, recentSubscriptions };
}
