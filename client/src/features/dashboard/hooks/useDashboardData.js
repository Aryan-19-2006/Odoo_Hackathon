import { useEffect, useState } from 'react';
import {
  loadAdminDashboard,
  loadCustomerDashboard,
  loadStaffDashboard,
} from '../services/dashboardData.js';

const EMPTY_DATE_RANGE = { from: '', to: '' };

const loaders = {
  admin: loadAdminDashboard,
  staff: loadStaffDashboard,
  customer: loadCustomerDashboard,
};

export default function useDashboardData({
  dateRange = EMPTY_DATE_RANGE,
  getIdToken,
  page = 1,
  role,
  user,
}) {
  const [state, setState] = useState({
    loading: false,
    data: null,
    error: null,
  });

  useEffect(() => {
    const loader = loaders[role];
    if (!loader) {
      setState({
        loading: false,
        data: null,
        error: new Error('An authenticated Admin, Staff, or Customer profile is required.'),
      });
      return undefined;
    }

    const controller = new AbortController();
    setState({ loading: true, data: null, error: null });

    loader({
      dateRange,
      getIdToken,
      page,
      role,
      signal: controller.signal,
      user,
    }).then(
      (data) => setState({ loading: false, data, error: null }),
      (error) => {
        if (error?.name !== 'CanceledError' && error?.code !== 'ERR_CANCELED') {
          setState({ loading: false, data: null, error });
        }
      },
    );

    return () => controller.abort();
  }, [dateRange, getIdToken, page, role, user]);

  return state;
}
