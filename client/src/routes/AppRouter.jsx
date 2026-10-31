import { BrowserRouter, Navigate, Route, Routes, useParams } from 'react-router-dom';
import ErrorState from '../components/feedback/ErrorState.jsx';
import AppLayout from '../layouts/AppLayout.jsx';
import DashboardPage from '../pages/DashboardPage.jsx';
import NotFoundPage from '../pages/NotFoundPage.jsx';
import ManagementModulePage from '../features/management/pages/ManagementModulePage.jsx';
import {
  canAccessModuleRoute,
  createDashboardNavigation,
} from '../features/dashboard/navigation.js';
import { dashboardPathForRole } from './routePaths.js';

function DashboardEntry({ getIdToken, user }) {
  if (user?.role === 'admin' || user?.role === 'staff' || user?.role === 'customer') {
    return <Navigate to={dashboardPathForRole(user.role)} replace />;
  }
  return <DashboardPage getIdToken={getIdToken} user={user} />;
}

function AuthorizedModule({ getIdToken, user }) {
  const { moduleId } = useParams();
  if (!canAccessModuleRoute(user, moduleId)) {
    return (
      <section className="rounded-card border border-line bg-white shadow-card">
        <ErrorState
          message="This module is not available for the permissions supplied by the authenticated profile."
          title="Access unavailable"
        />
      </section>
    );
  }
  return (
    <ManagementModulePage
      getIdToken={getIdToken}
      user={user}
    />
  );
}

export default function AppRouter({
  navigation,
  notifications,
  onLogout,
  onViewAllNotifications,
  profileItems,
  user,
  getIdToken,
} = {}) {
  const roleNavigation = navigation || createDashboardNavigation(user);

  return (
    <BrowserRouter>
      <Routes>
        <Route
          element={
            <AppLayout
              navigation={roleNavigation}
              notifications={notifications}
              onLogout={onLogout}
              onViewAllNotifications={onViewAllNotifications}
              profileItems={profileItems}
              user={user}
            />
          }
        >
          <Route
            index
            element={<DashboardEntry getIdToken={getIdToken} user={user} />}
          />
          <Route path="/dashboard" element={<DashboardEntry getIdToken={getIdToken} user={user} />} />
          <Route
            path="/admin/dashboard"
            element={
              <DashboardPage
                expectedRole="admin"
                getIdToken={getIdToken}
                user={user}
              />
            }
          />
          <Route
            path="/staff/dashboard"
            element={
              <DashboardPage
                expectedRole="staff"
                getIdToken={getIdToken}
                user={user}
              />
            }
          />
          <Route
            path="/customer/dashboard"
            element={
              <DashboardPage
                expectedRole="customer"
                getIdToken={getIdToken}
                user={user}
              />
            }
          />
          <Route
            path="/modules/:moduleId"
            element={<AuthorizedModule getIdToken={getIdToken} user={user} />}
          />
          <Route
            path="/modules/:moduleId/:recordId"
            element={<AuthorizedModule getIdToken={getIdToken} user={user} />}
          />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
