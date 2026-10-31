import { useEffect, useState } from 'react';
import { listRecords } from '../services/managementApi.js';

export default function useManagedList({
  filters,
  getIdToken,
  limit = 20,
  page = 1,
  refreshKey = 0,
  resource,
  search,
}) {
  const [state, setState] = useState({
    loading: true,
    data: null,
    error: null,
  });

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    async function load() {
      setState((current) => ({ ...current, loading: true, error: null }));
      try {
        if (typeof getIdToken !== 'function') {
          throw new Error(
            'Management APIs require the Firebase ID-token getter from the authentication provider.',
          );
        }
        const token = await getIdToken();
        const data = await listRecords(
          resource,
          token,
          {
            page,
            limit,
            ...(search ? { search } : {}),
            ...filters,
          },
          controller.signal,
        );
        if (active) setState({ loading: false, data, error: null });
      } catch (error) {
        if (
          active &&
          error?.name !== 'CanceledError' &&
          error?.code !== 'ERR_CANCELED'
        ) {
          setState({ loading: false, data: null, error });
        }
      }
    }

    load();
    return () => {
      active = false;
      controller.abort();
    };
  }, [filters, getIdToken, limit, page, refreshKey, resource, search]);

  return state;
}
