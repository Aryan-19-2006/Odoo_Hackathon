import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import AppLayout from '../layouts/AppLayout.jsx';
import DashboardPage from '../pages/DashboardPage.jsx';
import NotFoundPage from '../pages/NotFoundPage.jsx';

export default function AppRouter({
  navigation,
  notifications,
  onLogout,
  onViewAllNotifications,
  profileItems,
  user,
} = {}) {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          element={
            <AppLayout
              navigation={navigation}
              notifications={notifications}
              onLogout={onLogout}
              onViewAllNotifications={onViewAllNotifications}
              profileItems={profileItems}
              user={user}
            />
          }
        >
          <Route index element={<DashboardPage />} />
          <Route path="dashboard" element={<Navigate to="/" replace />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
