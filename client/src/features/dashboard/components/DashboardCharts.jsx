import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import Card from '../../../components/ui/Card.jsx';
import EmptyState from '../../../components/feedback/EmptyState.jsx';
import ErrorState from '../../../components/feedback/ErrorState.jsx';
import LoadingSkeleton from '../../../components/feedback/LoadingSkeleton.jsx';

const statusColors = {
  draft: '#94a3b8',
  quotation: '#8b5cf6',
  confirmed: '#3b82f6',
  active: '#10b981',
  paused: '#f59e0b',
  closed: '#64748b',
  expired: '#ef4444',
};

const formatStatus = (status) =>
  status.charAt(0).toUpperCase() + status.slice(1);

export function SubscriptionStatusChart({ loading, result }) {
  const failed = result?.find((item) => item.status === 'error');
  const data = result
    ?.filter((item) => item.status && Number.isFinite(item.count))
    .map((item) => ({
      name: formatStatus(item.status),
      status: item.status,
      value: item.count,
    }));

  return (
    <Card className="p-5 sm:p-6">
      <div className="mb-5">
        <h2 className="text-base font-semibold text-navy-950">
          Subscription status
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Counts from the subscriptions API
        </p>
      </div>
      {loading ? (
        <LoadingSkeleton className="py-8" lines={4} />
      ) : failed ? (
        <ErrorState error={failed.error} />
      ) : !data || data.length === 0 || data.every((item) => item.value === 0) ? (
        <EmptyState
          description="There are no subscriptions in this date range."
          title="No subscription activity"
        />
      ) : (
        <div className="grid items-center gap-5 sm:grid-cols-[minmax(0,1fr)_auto]">
          <div className="h-56 min-w-0">
            <ResponsiveContainer height="100%" width="100%">
              <PieChart>
                <Pie
                  data={data}
                  dataKey="value"
                  innerRadius={55}
                  nameKey="name"
                  outerRadius={82}
                  paddingAngle={2}
                >
                  {data.map((entry) => (
                    <Cell
                      fill={statusColors[entry.status]}
                      key={entry.status}
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value, name) => [value, name]}
                  contentStyle={{
                    borderRadius: 10,
                    borderColor: '#e2e8f0',
                    fontSize: 12,
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <ul className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-1">
            {data.map((item) => (
              <li
                className="flex items-center justify-between gap-3 text-xs"
                key={item.status}
              >
                <span className="flex items-center gap-2 text-slate-600">
                  <span
                    aria-hidden="true"
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: statusColors[item.status] }}
                  />
                  {item.name}
                </span>
                <span className="font-semibold tabular-nums text-slate-800">
                  {item.value.toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}

export function RevenueChartPlaceholder() {
  return (
    <Card className="p-5 sm:p-6">
      <div className="mb-5">
        <h2 className="text-base font-semibold text-navy-950">Revenue over time</h2>
        <p className="mt-1 text-sm text-slate-500">
          Collected revenue by period
        </p>
      </div>
      <EmptyState
        description="A revenue analytics endpoint and confirmed definition of collected revenue are not available yet. Draft invoices are not counted as payments."
        title="Revenue chart is not connected"
      />
    </Card>
  );
}
