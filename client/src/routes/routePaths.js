export const routePaths = {
  dashboard: '/',
  adminDashboard: '/admin/dashboard',
  staffDashboard: '/staff/dashboard',
  customerDashboard: '/customer/dashboard',
  module: (moduleId) => `/modules/${moduleId}`,
};

export function dashboardPathForRole(role) {
  if (role === 'admin') return routePaths.adminDashboard;
  if (role === 'staff') return routePaths.staffDashboard;
  if (role === 'customer') return routePaths.customerDashboard;
  return routePaths.dashboard;
}
