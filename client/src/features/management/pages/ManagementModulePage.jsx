import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  ArrowDown,
  ArrowDownUp,
  ArrowUp,
  Plus,
  RotateCw,
} from 'lucide-react';
import ActionMenu from '../../../components/ui/ActionMenu.jsx';
import Badge from '../../../components/ui/Badge.jsx';
import Button from '../../../components/ui/Button.jsx';
import ConfirmationDialog from '../../../components/dialog/ConfirmationDialog.jsx';
import DataTable from '../../../components/table/DataTable.jsx';
import ErrorState from '../../../components/feedback/ErrorState.jsx';
import EmptyState from '../../../components/feedback/EmptyState.jsx';
import Input from '../../../components/ui/Input.jsx';
import ModalDialog from '../../../components/dialog/ModalDialog.jsx';
import PageHeader from '../../../components/ui/PageHeader.jsx';
import SearchField from '../../../components/ui/SearchField.jsx';
import SelectControl from '../../../components/ui/SelectControl.jsx';
import useToast from '../../../hooks/useToast.js';
import { getApiErrorMessage } from '../../../services/apiError.js';
import {
  archiveRecord,
  confirmQuotation,
  createRecord,
  getRecord,
  listRecords,
  updateRecord,
} from '../services/managementApi.js';
import useManagedList from '../hooks/useManagedList.js';
import {
  getModuleDefinition,
  unavailableModules,
} from '../definitions.js';
import {
  canConfirmRecord,
  canManageRecords,
  canReadManagementModule,
  hasPermission,
} from '../utils/permissions.js';
import RecordForm from '../components/RecordForm.jsx';

const pageSize = 20;

function displayDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString();
}

function displayAmount(value) {
  if (value === undefined || value === null || !Number.isFinite(Number(value))) {
    return '—';
  }
  return Number(value).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function statusTone(value) {
  if (['active', 'confirmed'].includes(value)) return 'success';
  if (['quotation', 'inactive'].includes(value)) return 'warning';
  if (['archived', 'expired', 'cancelled'].includes(value)) return 'neutral';
  return 'neutral';
}

function formatCell(record, column) {
  const value = record[column.key];
  if (column.format === 'currency') return displayAmount(value);
  if (column.format === 'date') return displayDate(value);
  if (column.format === 'count') return Array.isArray(value) ? value.length : '—';
  if (column.format === 'variantCount') {
    return Array.isArray(value) ? value.length : 0;
  }
  if (column.format === 'variantSummary') {
    if (!Array.isArray(value) || value.length === 0) return 'No variants';
    const activeCount = value.filter((variant) => variant.status === 'active').length;
    return `${activeCount} active / ${value.length} total`;
  }
  if (column.format === 'status') {
    return <Badge tone={statusTone(value)}>{value || 'unknown'}</Badge>;
  }
  if (column.format === 'capitalize') {
    return value ? `${value[0].toUpperCase()}${value.slice(1)}` : '—';
  }
  if (column.format === 'relatedPlan') {
    const id = typeof value === 'object' && value !== null ? value._id : value;
    return id ? `…${String(id).slice(-8)}` : '—';
  }
  return value === undefined || value === null || value === '' ? '—' : String(value);
}

function compareValues(left, right) {
  if (left === null || left === undefined) return right === null || right === undefined ? 0 : -1;
  if (right === null || right === undefined) return 1;
  if (typeof left === 'number' && typeof right === 'number') return left - right;
  const leftDate = Date.parse(left);
  const rightDate = Date.parse(right);
  if (!Number.isNaN(leftDate) && !Number.isNaN(rightDate)) {
    return leftDate - rightDate;
  }
  return String(left).localeCompare(String(right), undefined, {
    numeric: true,
    sensitivity: 'base',
  });
}

function ListColumnHeader({ column, direction, onSort }) {
  const Icon = !direction ? ArrowDownUp : direction === 'asc' ? ArrowUp : ArrowDown;
  return (
    <button
      className="inline-flex items-center gap-1.5 text-left hover:text-slate-800"
      onClick={() => onSort(column.key)}
      type="button"
    >
      {column.label}
      <Icon aria-hidden="true" size={14} />
    </button>
  );
}

function useAccessToken(getIdToken) {
  return useCallback(async () => {
    if (typeof getIdToken !== 'function') {
      throw new Error(
        'Protected management requests require the Firebase ID-token getter from the authentication provider.',
      );
    }
    const token = await getIdToken();
    if (typeof token !== 'string' || !token.trim()) {
      throw new Error('Firebase did not provide an ID token for this session.');
    }
    return token;
  }, [getIdToken]);
}

function useReferenceOptions(resource, getIdToken, active) {
  const [state, setState] = useState({
    loading: false,
    error: null,
    data: [],
    moreAvailable: false,
    page: 1,
    pages: 1,
  });

  useEffect(() => {
    if (!active) return undefined;
    let alive = true;
    const controller = new AbortController();
    async function load() {
      setState((current) => ({ ...current, loading: true, error: null }));
      try {
        const token = await getIdToken();
        const result = await listRecords(
          resource,
          token,
          { page: 1, limit: 100, status: 'active' },
          controller.signal,
        );
        if (alive) {
          setState({
            loading: false,
            error: null,
            data: result.results,
            moreAvailable: result.pagination.page < result.pagination.pages,
            page: result.pagination.page,
            pages: result.pagination.pages,
          });
        }
      } catch (error) {
        if (alive && error?.code !== 'ERR_CANCELED' && error?.name !== 'CanceledError') {
          setState({
            loading: false,
            error,
            data: [],
            moreAvailable: false,
            page: 1,
            pages: 1,
          });
        }
      }
    }
    load();
    return () => {
      alive = false;
      controller.abort();
    };
  }, [active, getIdToken, resource]);

  const loadMore = useCallback(async () => {
    if (!active || state.loading || !state.moreAvailable) return;
    setState((current) => ({ ...current, loading: true, error: null }));
    try {
      const token = await getIdToken();
      const result = await listRecords(resource, token, {
        page: state.page + 1,
        limit: 100,
        status: 'active',
      });
      setState((current) => ({
        ...current,
        loading: false,
        error: null,
        data: [
          ...current.data,
          ...result.results.filter(
            (item) => !current.data.some((existing) => existing._id === item._id),
          ),
        ],
        page: result.pagination.page,
        pages: result.pagination.pages,
        moreAvailable: result.pagination.page < result.pagination.pages,
      }));
    } catch (error) {
      setState((current) => ({ ...current, loading: false, error }));
    }
  }, [active, getIdToken, resource, state.loading, state.moreAvailable, state.page]);

  return { ...state, loadMore };
}

function useFormOptions(resource, getIdToken, active, canLoadTemplates) {
  const products = useReferenceOptions(
    'products',
    getIdToken,
    active && ['plans', 'templates', 'quotations'].includes(resource),
  );
  const plans = useReferenceOptions(
    'plans',
    getIdToken,
    active && ['templates', 'quotations'].includes(resource),
  );
  const templates = useReferenceOptions(
    'templates',
    getIdToken,
    active && canLoadTemplates && resource === 'quotations',
  );
  return { products, plans, templates };
}

function ReferenceDataNotice({ state, label }) {
  if (state.error) {
    return (
      <ErrorState
        error={state.error}
        title={`Unable to load ${label}`}
      />
    );
  }
  if (state.moreAvailable) {
    return (
      <div className="flex flex-col gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-800 sm:flex-row sm:items-center sm:justify-between">
        <p>More active {label} are available. Load the next API page to find them.</p>
        <Button
          disabled={state.loading}
          onClick={state.loadMore}
          size="sm"
          variant="secondary"
        >
          {state.loading ? 'Loading…' : `Load next ${label}`}
        </Button>
      </div>
    );
  }
  return null;
}

function FormOptionsPanel({ options }) {
  const failures = [
    ['products', options.products, 'products'],
    ['plans', options.plans, 'plans'],
    ['templates', options.templates, 'quotation templates'],
  ].filter(([, state]) => state.error);

  return (
    <div className="mb-4 space-y-3">
      {failures.map(([key, state, label]) => (
        <ReferenceDataNotice key={key} label={label} state={state} />
      ))}
      {[['products', options.products], ['plans', options.plans], ['templates', options.templates]]
        .filter(([, state]) => state.moreAvailable || state.loading)
        .map(([key, state]) => (
          <ReferenceDataNotice
            key={key}
            label={key === 'templates' ? 'quotation templates' : key}
            state={state}
          />
        ))}
    </div>
  );
}

function UnavailableModule({ moduleId }) {
  const unavailable = unavailableModules[moduleId];
  const label = unavailable?.label || moduleId;
  const Icon = unavailable?.icon;
  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[{ label: 'Dashboard', to: '/' }, { label }]}
        description="This module is not connected because the checked-in backend does not provide its API or database schema."
        title={label}
      />
      <section className="rounded-card border border-line bg-white shadow-card">
        <EmptyState
          description="No records, forms, or sample data are displayed. Connect the Member 2 backend contract before enabling this module."
          icon={Icon}
          title={`${label} API is unavailable`}
        />
      </section>
    </div>
  );
}

export default function ManagementModulePage({ getIdToken, user }) {
  const { moduleId, recordId } = useParams();
  const definition = getModuleDefinition(moduleId);

  if (!definition) {
    return <UnavailableModule moduleId={moduleId} />;
  }
  if (!canReadManagementModule(user, definition, moduleId)) {
    return (
      <ErrorState
        message="This module is not available for the permissions supplied by the authenticated profile."
        title="Access unavailable"
      />
    );
  }

  return recordId ? (
    <ManagedRecordDetail
      definition={definition}
      getIdToken={getIdToken}
      moduleId={moduleId}
      recordId={recordId}
      user={user}
    />
  ) : (
    <ManagedRecordList
      definition={definition}
      getIdToken={getIdToken}
      moduleId={moduleId}
      user={user}
    />
  );
}

function ManagedRecordList({ definition, getIdToken, moduleId, user }) {
  const { toast } = useToast();
  const navigate = useNavigate();
  const accessToken = useAccessToken(getIdToken);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [frequency, setFrequency] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [planId, setPlanId] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [sort, setSort] = useState({ key: '', direction: 'asc' });
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [target, setTarget] = useState(null);
  const canManage = canManageRecords(user, definition);
  const canCreate =
    canManage &&
    !(user?.role === 'customer' && moduleId === 'quotations');
  const options = useFormOptions(
    definition.resource,
    accessToken,
    formOpen,
    user?.role !== 'customer',
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const filters = useMemo(
    () => ({
      ...(status ? { status } : {}),
      ...(frequency ? { frequency } : {}),
      ...(customerId ? { customerId } : {}),
      ...(/^[a-f\d]{24}$/i.test(planId) ? { planId } : {}),
      ...(from ? { from } : {}),
      ...(to ? { to } : {}),
    }),
    [customerId, frequency, from, planId, status, to],
  );
  const state = useManagedList({
    filters,
    getIdToken: accessToken,
    page,
    refreshKey,
    resource: definition.resource,
    search: debouncedSearch,
    limit: pageSize,
  });

  const rows = state.data?.results || [];
  const sortedRows = useMemo(() => {
    if (!sort.key) return rows;
    return [...rows].sort((a, b) => {
      const comparison = compareValues(a[sort.key], b[sort.key]);
      return sort.direction === 'asc' ? comparison : -comparison;
    });
  }, [definition.columns, rows, sort]);

  function handleSort(key) {
    setSort((current) => ({
      key,
      direction:
        current.key === key && current.direction === 'asc' ? 'desc' : 'asc',
    }));
  }

  const columns = useMemo(() => {
    const base = definition.columns.map((column) => ({
      key: column.key,
      header: (
        <ListColumnHeader
          column={column}
          direction={sort.key === column.key ? sort.direction : ''}
          onSort={handleSort}
        />
      ),
      render: (row) => formatCell(row, column),
    }));
    base.push({
      key: 'actions',
      header: 'Actions',
      headerClassName: 'text-right',
      cellClassName: 'text-right',
      render: (row) => {
        const id = String(row._id);
        const ownManage = user?.role === 'customer'
          ? hasPermission(user, `${definition.managePermission}:own`)
          : canManage;
        const canConfirm = canConfirmRecord(user, definition);
        const items = [
          {
            label: 'View details',
            to: `/modules/${moduleId}/${encodeURIComponent(id)}`,
          },
        ];
        if (ownManage && definition.supportsEdit && row.status === 'quotation') {
          items.push({
            label: 'Edit',
            to: `/modules/${moduleId}/${encodeURIComponent(id)}?edit=1`,
          });
        } else if (canManage && definition.supportsEdit) {
          items.push({
            label: 'Edit',
            to: `/modules/${moduleId}/${encodeURIComponent(id)}?edit=1`,
          });
        }
        if (canConfirm && row.status === 'quotation') {
          items.push({
            label: 'Confirm quotation',
            onSelect: () => setTarget({ record: row, action: 'confirm' }),
          });
        }
        if (canManage && definition.supportsArchive) {
          items.push({
            label: definition.archiveLabel,
            destructive: true,
            onSelect: () => setTarget({ record: row, action: 'archive' }),
          });
        }
        return (
          <div className="flex justify-end">
            <ActionMenu ariaLabel={`Actions for ${row.name || row.quotationNumber || 'record'}`} items={items} />
          </div>
        );
      },
    });
    return base;
  }, [canManage, definition, moduleId, sort, user]);

  async function submitCreate(payload) {
    setSaving(true);
    try {
      const token = await accessToken();
      const result = await createRecord(definition.resource, token, payload);
      toast.success(`${definition.singular} created successfully.`);
      setFormOpen(false);
      setRefreshKey((value) => value + 1);
      const created = result?.quotation || result;
      const id = created?._id;
      if (id) navigate(`/modules/${moduleId}/${encodeURIComponent(id)}`);
    } catch (error) {
      toast.error(getApiErrorMessage(error, `Unable to create ${definition.singular.toLowerCase()}.`));
    } finally {
      setSaving(false);
    }
  }

  async function runConfirmation() {
    if (!target) return;
    setConfirming(true);
    try {
      const token = await accessToken();
      if (target.action === 'confirm') {
        const result = await confirmQuotation(token, target.record._id);
        if (result?.expired) {
          toast.error('This quotation has expired and cannot be confirmed.');
        } else {
          toast.success('Quotation confirmed successfully.');
        }
      } else {
        await archiveRecord(definition.resource, token, target.record._id);
        toast.success(`${definition.singular} archived successfully.`);
      }
      setTarget(null);
      setRefreshKey((value) => value + 1);
    } catch (error) {
      toast.error(
        getApiErrorMessage(
          error,
          target.action === 'confirm'
            ? 'Unable to confirm quotation.'
            : `Unable to ${definition.archiveLabel.toLowerCase()}.`,
        ),
      );
    } finally {
      setConfirming(false);
    }
  }

  const pagination = state.data?.pagination;
  const title = moduleId === 'variants' ? 'Product variant management' : definition.label;
  const description =
    moduleId === 'variants'
      ? 'Variants are nested under products and are created, edited, and deactivated through the parent product API.'
      : definition.resource === 'quotations'
        ? 'Quotation creation also creates a linked subscription. The server calculates and snapshots prices.'
        : 'Records are loaded from the backend API with server-side pagination and supported filters.';

  return (
    <div className="space-y-6">
      <PageHeader
        actions={
          <>
            <Button
              onClick={() => setRefreshKey((value) => value + 1)}
              size="sm"
              variant="secondary"
            >
              <RotateCw aria-hidden="true" size={15} />
              Refresh
            </Button>
            {canCreate && (
              <Button onClick={() => setFormOpen(true)} size="sm">
                <Plus aria-hidden="true" size={16} />
                Create {definition.singular}
              </Button>
            )}
          </>
        }
        breadcrumbs={[{ label: 'Dashboard', to: '/' }, { label: definition.label }]}
        description={description}
        title={title}
      />

      {moduleId === 'variants' && (
        <p className="rounded-xl border border-brand-100 bg-brand-50 px-4 py-3 text-sm text-brand-800">
          There is no standalone variant endpoint. Choose a product’s details,
          then edit the nested variants on that product.
        </p>
      )}

      <section className="space-y-4 rounded-card border border-line bg-white p-4 shadow-card sm:p-5">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div className="md:col-span-2">
            <SearchField
              ariaLabel={definition.searchPlaceholder}
              onChange={(event) => setSearch(event.target.value)}
              value={search}
            />
            <p className="mt-1 text-xs text-slate-500">{definition.searchDescription}</p>
          </div>
          {definition.filters.includes('status') && (
            <SelectControl
              aria-label="Filter by status"
              onChange={(event) => {
                setStatus(event.target.value);
                setPage(1);
              }}
              options={definition.statuses.map((value) => ({ value, label: value }))}
              placeholder="All statuses"
              value={status}
            />
          )}
          {definition.filters.includes('frequency') && (
            <SelectControl
              aria-label="Filter by frequency"
              onChange={(event) => {
                setFrequency(event.target.value);
                setPage(1);
              }}
              options={definition.frequencies.map((value) => ({ value, label: value }))}
              placeholder="All frequencies"
              value={frequency}
            />
          )}
          {definition.filters.includes('customerId') && user?.role !== 'customer' && (
            <Input
              aria-label="Filter by customer ID"
              maxLength={160}
              onChange={(event) => {
                setCustomerId(event.target.value);
                setPage(1);
              }}
              placeholder="Customer ID"
              value={customerId}
            />
          )}
          {definition.filters.includes('planId') && user?.role !== 'customer' && (
            <div>
              <Input
                aria-label="Filter by plan ID"
                maxLength={24}
                onChange={(event) => {
                  setPlanId(event.target.value);
                  setPage(1);
                }}
                placeholder="Plan ID (MongoDB)"
                value={planId}
              />
              {planId && !/^[a-f\d]{24}$/i.test(planId) && (
                <p className="mt-1 text-xs text-amber-700">
                  Enter a valid 24-character MongoDB ID to apply this filter.
                </p>
              )}
            </div>
          )}
          {definition.filters.includes('from') && (
            <Input
              aria-label="Created from"
              onChange={(event) => {
                setFrom(event.target.value);
                setPage(1);
              }}
              type="date"
              value={from}
            />
          )}
          {definition.filters.includes('to') && (
            <Input
              aria-label="Created to"
              min={from || undefined}
              onChange={(event) => {
                setTo(event.target.value);
                setPage(1);
              }}
              type="date"
              value={to}
            />
          )}
        </div>
        <p className="text-xs text-slate-500">
          The API does not support sorting. Column sorting applies to the current
          page only; pagination, search, and filters remain server-side.
        </p>
        <DataTable
          columns={columns}
          emptyDescription="Try changing the search or filters, or create a record if you have permission."
          emptyTitle={`No ${definition.label.toLowerCase()} found`}
          error={state.error}
          loading={state.loading}
          onRetry={() => setRefreshKey((value) => value + 1)}
          pagination={
            pagination
              ? { ...pagination, onPageChange: setPage }
              : undefined
          }
          rows={sortedRows}
        />
      </section>

      <ModalDialog
        description={`Create a ${definition.singular.toLowerCase()} using the backend's documented fields.`}
        onClose={() => !saving && setFormOpen(false)}
        open={formOpen}
        size="lg"
        title={`Create ${definition.singular}`}
      >
        <FormOptionsPanel options={options} />
        <RecordForm
          onCancel={() => setFormOpen(false)}
          onSubmit={submitCreate}
          options={{
            products: options.products.data,
            plans: options.plans.data,
            templates: options.templates.data,
          }}
          resource={definition.resource}
          submitting={saving}
        />
      </ModalDialog>

      <ConfirmationDialog
        cancelLabel="Cancel"
        confirmLabel={target?.action === 'confirm' ? 'Confirm quotation' : definition.archiveLabel}
        description={
          target?.action === 'confirm'
            ? `Confirm ${target.record?.quotationNumber || 'this quotation'}? The backend also confirms its linked subscription.`
            : `${definition.archiveLabel} for "${target?.record?.name || target?.record?.quotationNumber || 'this record'}"? The record is retained by the backend for historical references.`
        }
        loading={confirming}
        onCancel={() => setTarget(null)}
        onConfirm={runConfirmation}
        open={Boolean(target)}
        title={target?.action === 'confirm' ? 'Confirm quotation' : definition.archiveLabel}
        tone={target?.action === 'archive' ? 'danger' : 'primary'}
      />
    </div>
  );
}

function ManagedRecordDetail({ definition, getIdToken, moduleId, recordId, user }) {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const accessToken = useAccessToken(getIdToken);
  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [formOpen, setFormOpen] = useState(searchParams.get('edit') === '1');
  const [saving, setSaving] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const options = useFormOptions(
    definition.resource,
    accessToken,
    formOpen,
    user?.role !== 'customer',
  );

  useEffect(() => {
    let alive = true;
    const controller = new AbortController();
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const token = await accessToken();
        const result = await getRecord(definition.resource, token, recordId, controller.signal);
        if (alive) {
          setRecord(result);
          setLoading(false);
          if (searchParams.get('edit') === '1') setFormOpen(true);
        }
      } catch (loadError) {
        if (alive && loadError?.code !== 'ERR_CANCELED' && loadError?.name !== 'CanceledError') {
          setError(loadError);
          setLoading(false);
        }
      }
    }
    load();
    return () => {
      alive = false;
      controller.abort();
    };
  }, [accessToken, definition.resource, recordId, refreshKey, searchParams]);

  const canManage = canManageRecords(user, definition);
  const canEdit =
    user?.role === 'customer' && moduleId === 'quotations'
      ? hasPermission(user, `${definition.managePermission}:own`) &&
        record?.status === 'quotation'
      : canManage &&
        definition.supportsEdit &&
        (moduleId !== 'quotations' || record?.status === 'quotation');
  const canConfirm = canConfirmRecord(user, definition) && record?.status === 'quotation';
  const canArchive = canManage && definition.supportsArchive;

  async function submitUpdate(payload) {
    setSaving(true);
    try {
      const token = await accessToken();
      await updateRecord(definition.resource, token, recordId, payload);
      toast.success(`${definition.singular} updated successfully.`);
      setFormOpen(false);
      setSearchParams({});
      setRefreshKey((value) => value + 1);
    } catch (saveError) {
      toast.error(getApiErrorMessage(saveError, `Unable to update ${definition.singular.toLowerCase()}.`));
    } finally {
      setSaving(false);
    }
  }

  async function performConfirm() {
    setConfirming(true);
    try {
      const token = await accessToken();
      const result = await confirmQuotation(token, recordId);
      if (result?.expired) {
        toast.error('This quotation has expired and cannot be confirmed.');
      } else {
        toast.success('Quotation confirmed successfully.');
      }
      setConfirmOpen(false);
      setRefreshKey((value) => value + 1);
    } catch (confirmError) {
      toast.error(getApiErrorMessage(confirmError, 'Unable to confirm quotation.'));
    } finally {
      setConfirming(false);
    }
  }

  async function performArchive() {
    setConfirming(true);
    try {
      const token = await accessToken();
      await archiveRecord(definition.resource, token, recordId);
      toast.success(`${definition.singular} archived successfully.`);
      navigate(`/modules/${moduleId}`);
    } catch (archiveError) {
      toast.error(getApiErrorMessage(archiveError, `Unable to ${definition.archiveLabel.toLowerCase()}.`));
    } finally {
      setConfirming(false);
      setConfirmOpen(false);
    }
  }

  const title = record?.name || record?.quotationNumber || definition.singular;
  const details = detailFields(definition.resource, record);

  return (
    <div className="space-y-6">
      <PageHeader
        actions={
          <>
            {canConfirm && (
              <Button onClick={() => setConfirmOpen(true)} size="sm">
                Confirm quotation
              </Button>
            )}
            {canArchive && (
              <Button onClick={() => setConfirmOpen(true)} size="sm" variant="danger">
                {definition.archiveLabel}
              </Button>
            )}
            {canEdit && (
              <Button onClick={() => setFormOpen(true)} size="sm" variant="secondary">
                Edit
              </Button>
            )}
            <Button as={Link} to={`/modules/${moduleId}`} size="sm" variant="secondary">
              Back to {definition.label}
            </Button>
          </>
        }
        breadcrumbs={[
          { label: 'Dashboard', to: '/' },
          { label: definition.label, to: `/modules/${moduleId}` },
          { label: title },
        ]}
        description={`${definition.singular} details from the backend.`}
        title={title}
      />

      {loading ? (
        <div className="rounded-card border border-line bg-white p-6 text-sm text-slate-500 shadow-card">
          Loading record…
        </div>
      ) : error ? (
        <section className="rounded-card border border-line bg-white shadow-card">
          <ErrorState
            error={error}
            onRetry={() => setRefreshKey((value) => value + 1)}
          />
        </section>
      ) : record ? (
        <div className="space-y-6">
          <section className="rounded-card border border-line bg-white p-5 shadow-card sm:p-6">
            <div className="flex flex-wrap items-center gap-3 border-b border-line pb-4">
              {record.status && <Badge tone={statusTone(record.status)}>{record.status}</Badge>}
              <span className="text-sm text-slate-500">
                ID: <code className="text-xs">{record._id}</code>
              </span>
            </div>
            <dl className="mt-5 grid gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
              {details.map(([label, value]) => (
                <div key={label}>
                  <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</dt>
                  <dd className="mt-1 break-words text-sm text-slate-800">{value}</dd>
                </div>
              ))}
            </dl>
          </section>
          {Array.isArray(record.variants) && record.variants.length > 0 && (
            <section className="rounded-card border border-line bg-white p-5 shadow-card sm:p-6">
              <h2 className="text-base font-semibold text-navy-950">Product variants</h2>
              <div className="mt-4 overflow-x-auto">
                <table className="min-w-full divide-y divide-line text-left text-sm">
                  <thead>
                    <tr className="text-xs uppercase tracking-wide text-slate-500">
                      <th className="px-3 py-2">Name</th>
                      <th className="px-3 py-2">SKU</th>
                      <th className="px-3 py-2">Price delta</th>
                      <th className="px-3 py-2">Cost delta</th>
                      <th className="px-3 py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {record.variants.map((variant) => (
                      <tr key={variant._id}>
                        <td className="px-3 py-3">{variant.name}</td>
                        <td className="px-3 py-3">{variant.sku || '—'}</td>
                        <td className="px-3 py-3">{displayAmount(variant.priceDelta)}</td>
                        <td className="px-3 py-3">{displayAmount(variant.costDelta)}</td>
                        <td className="px-3 py-3"><Badge tone={statusTone(variant.status)}>{variant.status}</Badge></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
          {Array.isArray(record.items) && record.items.length > 0 && (
            <section className="rounded-card border border-line bg-white p-5 shadow-card sm:p-6">
              <h2 className="text-base font-semibold text-navy-950">Line items</h2>
              <div className="mt-4 overflow-x-auto">
                <table className="min-w-full divide-y divide-line text-left text-sm">
                  <thead>
                    <tr className="text-xs uppercase tracking-wide text-slate-500">
                      <th className="px-3 py-2">Product</th>
                      <th className="px-3 py-2">Variant</th>
                      <th className="px-3 py-2">Quantity</th>
                      <th className="px-3 py-2">Unit price</th>
                      <th className="px-3 py-2">Tax</th>
                      <th className="px-3 py-2">Line total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {record.items.map((item, index) => (
                      <tr key={item._id || index}>
                        <td className="px-3 py-3">{item.productName || `…${String(item.productId || '').slice(-8)}`}</td>
                        <td className="px-3 py-3">{item.variantName || '—'}</td>
                        <td className="px-3 py-3">{item.quantity}</td>
                        <td className="px-3 py-3">{displayAmount(item.unitPrice)}</td>
                        <td className="px-3 py-3">{Number(item.taxRate || 0)}%</td>
                        <td className="px-3 py-3">{displayAmount(item.lineTotal)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </div>
      ) : (
        <EmptyState title="Record not found" description="The API returned no record for this ID." />
      )}

      <ModalDialog
        description={`Update this ${definition.singular.toLowerCase()} using fields supported by the API.`}
        onClose={() => !saving && setFormOpen(false)}
        open={formOpen && Boolean(record)}
        size="lg"
        title={`Edit ${definition.singular}`}
      >
        <FormOptionsPanel options={options} />
        <RecordForm
          editing
          key={`${record?._id}-${formOpen}`}
          onCancel={() => {
            setFormOpen(false);
            setSearchParams({});
          }}
          onSubmit={submitUpdate}
          options={{
            products: options.products.data,
            plans: options.plans.data,
            templates: options.templates.data,
          }}
          record={record}
          resource={definition.resource}
          submitting={saving}
        />
      </ModalDialog>

      <ConfirmationDialog
        confirmLabel={canConfirm ? 'Confirm quotation' : definition.archiveLabel}
        description={
          canConfirm
            ? `Confirm ${record?.quotationNumber || 'this quotation'}? The backend also confirms its linked subscription.`
            : `${definition.archiveLabel} this record? The backend retains historical references.`
        }
        loading={confirming}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={canConfirm ? performConfirm : performArchive}
        open={confirmOpen}
        title={canConfirm ? 'Confirm quotation' : definition.archiveLabel}
        tone={canConfirm ? 'primary' : 'danger'}
      />
    </div>
  );
}

function detailFields(resource, record) {
  if (!record) return [];
  const fields = {
    products: [
      ['Type', record.type || '—'],
      ['Sales price', displayAmount(record.salesPrice)],
      ['Cost price', displayAmount(record.costPrice)],
      ['Description', record.description || '—'],
      ['Created', displayDate(record.createdAt)],
      ['Updated', displayDate(record.updatedAt)],
    ],
    plans: [
      ['Frequency', record.frequency || '—'],
      ['Minimum quantity', record.minQuantity ?? '—'],
      ['Product IDs', (record.productIds || []).map((id) => String(id)).join(', ') || '—'],
      ['Availability start', displayDate(record.availableFrom)],
      ['Availability end', displayDate(record.availableTo)],
      ['Auto-close', record.autoClose ? `Yes, after ${record.autoCloseAfterCycles} cycles` : 'No'],
      ['Early close', record.earlyCloseAllowed ? 'Allowed' : 'Not allowed'],
      ['Pause', record.pauseAllowed ? 'Allowed' : 'Not allowed'],
      ['Renewal', record.renewalAllowed ? 'Allowed' : 'Not allowed'],
      ['Description', record.description || '—'],
      ['Created', displayDate(record.createdAt)],
      ['Updated', displayDate(record.updatedAt)],
    ],
    templates: [
      ['Plan ID', String(record.planId || '—')],
      ['Validity days', record.validityDays ?? '—'],
      ['Total', displayAmount(record.totalAmount)],
      ['Notes', record.notes || '—'],
      ['Created', displayDate(record.createdAt)],
      ['Updated', displayDate(record.updatedAt)],
    ],
    quotations: [
      ['Customer ID', record.customerId || '—'],
      ['Plan ID', String(record.planId || '—')],
      ['Template ID', record.templateId ? String(record.templateId) : '—'],
      ['Total', displayAmount(record.totalAmount)],
      ['Issued', displayDate(record.issuedAt)],
      ['Expires', displayDate(record.expiresAt)],
      ['Confirmed', displayDate(record.confirmedAt)],
      ['Linked subscription', record.subscriptionId ? String(record.subscriptionId) : '—'],
      ['Notes', record.notes || '—'],
      ['Created', displayDate(record.createdAt)],
    ],
  };
  return fields[resource] || [];
}
