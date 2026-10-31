import Badge from '../../../components/ui/Badge.jsx';
import DataTable from '../../../components/table/DataTable.jsx';
import { classNames } from '../../../utils/classNames.js';

const statusTones = {
  active: 'success',
  confirmed: 'info',
  quotation: 'warning',
  paused: 'warning',
  closed: 'neutral',
  expired: 'danger',
  draft: 'neutral',
};

function displayDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? '—'
    : new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(date);
}

export default function RecentSubscriptions({
  loading,
  onPageChange,
  paginated = false,
  result,
  title = 'Recent subscriptions',
  customerView = false,
}) {
  const columns = [
    {
      key: 'subscriptionNumber',
      header: 'Subscription',
      render: (row) => (
        <span className="font-medium text-slate-900">
          {row.subscriptionNumber || row._id || '—'}
        </span>
      ),
    },
    ...(customerView
      ? []
      : [
          {
            key: 'customerId',
            header: 'Customer',
            render: (row) => row.customerId || '—',
          },
        ]),
    {
      key: 'plan',
      header: 'Plan',
      render: (row) => row.plan?.name || row.plan?.frequency || '—',
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => (
        <Badge
          className={classNames('capitalize')}
          tone={statusTones[row.status] || 'neutral'}
        >
          {row.status || 'Unknown'}
        </Badge>
      ),
    },
    {
      key: 'startDate',
      header: 'Started',
      render: (row) => displayDate(row.startDate),
    },
    ...(customerView
      ? [
          {
            key: 'nextBillingDate',
            header: 'Next billing',
            render: (row) => displayDate(row.nextBillingDate),
          },
        ]
      : []),
  ];

  return (
    <section>
      <div className="mb-4">
        <h2 className="text-base font-semibold text-navy-950">{title}</h2>
        <p className="mt-1 text-sm text-slate-500">
          Returned by the protected subscriptions API
        </p>
      </div>
      <DataTable
        columns={columns}
        emptyDescription="Subscriptions will appear here when the API returns records."
        emptyTitle="No subscriptions found"
        error={result?.status === 'error' ? result.error : null}
        loading={loading}
        pagination={
          paginated && result?.status === 'success'
            ? {
                ...result.data.pagination,
                onPageChange,
              }
            : undefined
        }
        rows={result?.status === 'success' ? result.data.results : []}
      />
    </section>
  );
}
