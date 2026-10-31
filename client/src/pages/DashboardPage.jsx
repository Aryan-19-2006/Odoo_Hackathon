import { lazy, Suspense, useState } from 'react';
import {
  BarChart3,
  CreditCard,
  FileText,
  Users,
  Wallet,
} from 'lucide-react';
import ErrorState from '../components/feedback/ErrorState.jsx';
import LoadingSkeleton from '../components/feedback/LoadingSkeleton.jsx';
import DateRangeControl from '../components/ui/DateRangeControl.jsx';
import PageHeader from '../components/ui/PageHeader.jsx';
import SummaryCard from '../components/ui/SummaryCard.jsx';
import IntegrationPending from '../features/dashboard/components/IntegrationPending.jsx';
import RecentSubscriptions from '../features/dashboard/components/RecentSubscriptions.jsx';
import useDashboardData from '../features/dashboard/hooks/useDashboardData.js';

const SubscriptionStatusChart = lazy(() =>
  import('../features/dashboard/components/DashboardCharts.jsx').then((module) => ({
    default: module.SubscriptionStatusChart,
  })),
);
const RevenueChartPlaceholder = lazy(() =>
  import('../features/dashboard/components/DashboardCharts.jsx').then((module) => ({
    default: module.RevenueChartPlaceholder,
  })),
);

function PageLoadError({ error }) {
  return (
    <section className="rounded-card border border-line bg-white shadow-card">
      <ErrorState
        error={error}
        title="Dashboard data is unavailable"
      />
    </section>
  );
}

function AdminDashboard({ getIdToken, user }) {
  const [dateRange, setDateRange] = useState({ from: '', to: '' });
  const { data, error, loading } = useDashboardData({
    dateRange,
    getIdToken,
    role: 'admin',
    user,
  });

  if (error) return <PageLoadError error={error} />;

  const active = data?.activeSubscriptions;
  const activeCount =
    active?.status === 'success'
      ? active.data.pagination.total.toLocaleString()
      : '—';

  return (
    <div className="space-y-7">
      <PageHeader
        description="A real-time view of subscription operations and business performance."
        eyebrow="Admin workspace"
        title="Dashboard"
      />

      <div className="max-w-3xl">
        <DateRangeControl onChange={setDateRange} value={dateRange} />
        <p className="mt-2 text-xs text-slate-500">
          The selected dates filter subscriptions by their start date.
        </p>
      </div>

      <section aria-label="Business summary" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <SummaryCard
          caption="No customers API is connected"
          icon={Users}
          label="Total customers"
          value="—"
        />
        <SummaryCard
          caption="No staff directory API is connected"
          icon={Users}
          label="Total staff"
          value="—"
        />
        <SummaryCard
          caption="Subscriptions started in the selected range"
          icon={BarChart3}
          label="Active subscriptions"
          value={loading ? '…' : activeCount}
        />
        <SummaryCard
          caption="Requires a payments or analytics API"
          icon={Wallet}
          label="Revenue collected"
          value="—"
        />
        <SummaryCard
          caption="Requires invoice balances from the API"
          icon={FileText}
          label="Outstanding balances"
          value="—"
        />
        <SummaryCard
          caption="Requires invoice status data from the API"
          icon={CreditCard}
          label="Overdue invoices"
          value="—"
        />
      </section>
      {active?.status === 'error' && (
        <section className="rounded-card border border-line bg-white shadow-card">
          <ErrorState
            error={active.error}
            title="Active subscriptions could not be loaded"
          />
        </section>
      )}

      <Suspense
        fallback={
          <section aria-label="Analytics" className="grid gap-5 xl:grid-cols-2">
            <div className="rounded-card border border-line bg-white p-5 shadow-card">
              <LoadingSkeleton lines={5} />
            </div>
            <div className="rounded-card border border-line bg-white p-5 shadow-card">
              <LoadingSkeleton lines={5} />
            </div>
          </section>
        }
      >
        <section aria-label="Analytics" className="grid gap-5 xl:grid-cols-2">
          <SubscriptionStatusChart
            loading={loading}
            result={data?.subscriptionStatuses}
          />
          <RevenueChartPlaceholder />
        </section>
      </Suspense>

      <section aria-label="Payments and invoices" className="grid gap-5 lg:grid-cols-2">
        <IntegrationPending
          description="There is no payments API or payment history contract in the current backend."
          title="Recent payments"
        />
        <IntegrationPending
          description="There is no invoice API in the current backend. Draft invoices cannot be counted as collected revenue."
          title="Invoice activity"
        />
      </section>

      <RecentSubscriptions
        loading={loading}
        result={data?.recentSubscriptions}
      />
    </div>
  );
}

function StaffDashboard({ getIdToken, user }) {
  const { data, error, loading } = useDashboardData({
    getIdToken,
    role: 'staff',
    user,
  });

  if (error) return <PageLoadError error={error} />;

  const resources = data?.resources || [];
  const resourceLabels = {
    products: 'Products',
    plans: 'Plans',
    quotations: 'Quotations',
    subscriptions: 'Subscriptions',
  };
  const resourceIcons = {
    products: BarChart3,
    plans: FileText,
    quotations: FileText,
    subscriptions: CreditCard,
  };

  return (
    <div className="space-y-7">
      <PageHeader
        description="Operational overview based only on modules your backend permissions allow."
        eyebrow="Staff workspace"
        title="Dashboard"
      />

      {loading ? (
        <section aria-label="Operational summary" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => (
            <div className="rounded-card border border-line bg-white p-5 shadow-card" key={index}>
              <LoadingSkeleton lines={3} />
            </div>
          ))}
        </section>
      ) : resources.length === 0 ? (
        <section className="rounded-card border border-line bg-white shadow-card">
          <ErrorState
            message="No dashboard resource is available for the permissions supplied by the authenticated profile."
            title="No operational modules available"
          />
        </section>
      ) : (
        <section aria-label="Operational summary" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {resources.map(({ resource, result }) => {
            const Icon = resourceIcons[resource];
            const count =
              result.status === 'success'
                ? result.data.pagination.total.toLocaleString()
                : '—';
            return (
              <div key={resource}>
                {result.status === 'success' ? (
                  <SummaryCard
                    caption="Records available to your account"
                    icon={Icon}
                    label={resourceLabels[resource]}
                    value={loading ? '…' : count}
                  />
                ) : (
                  <section className="rounded-card border border-line bg-white shadow-card">
                    <ErrorState
                      error={result.error}
                      title={`${resourceLabels[resource]} unavailable`}
                    />
                  </section>
                )}
              </div>
            );
          })}
        </section>
      )}

      <section className="grid gap-5 lg:grid-cols-2">
        <IntegrationPending
          description="Customer directory access is shown only when its API and permission contract are supplied."
          title="Customer operations"
        />
        <IntegrationPending
          description="Invoice and payment APIs are not present in the current backend."
          title="Billing operations"
        />
      </section>

      <section className="rounded-card border border-line bg-white p-5 shadow-card sm:p-6">
        <h2 className="text-base font-semibold text-navy-950">Reports</h2>
        <p className="mt-1 text-sm leading-6 text-slate-500">
          Report links appear when an analytics API and the matching backend
          permission are available.
        </p>
      </section>
    </div>
  );
}

function UpcomingBilling({ result }) {
  if (result?.status === 'error') {
    return (
      <section className="rounded-card border border-line bg-white shadow-card">
        <ErrorState error={result.error} title="Upcoming billing unavailable" />
      </section>
    );
  }
  if (result?.status !== 'success') {
    return (
      <section className="rounded-card border border-line bg-white p-5 shadow-card">
        <LoadingSkeleton lines={4} />
      </section>
    );
  }

  const upcoming = result.data.results
    .filter((subscription) => subscription.nextBillingDate)
    .sort(
      (left, right) =>
        new Date(left.nextBillingDate) - new Date(right.nextBillingDate),
    )
    .slice(0, 5);
  const truncated = result.data.pagination.total > result.data.results.length;

  return (
    <section className="rounded-card border border-line bg-white p-5 shadow-card sm:p-6">
      <h2 className="text-base font-semibold text-navy-950">Upcoming billing</h2>
      <p className="mt-1 text-sm text-slate-500">
        Next dates from your loaded active subscriptions
      </p>
      {upcoming.length === 0 ? (
        <p className="mt-6 text-sm text-slate-500">No upcoming billing dates are available.</p>
      ) : (
        <ul className="mt-4 divide-y divide-line">
          {upcoming.map((subscription) => (
            <li
              className="flex items-center justify-between gap-3 py-3"
              key={subscription._id || subscription.subscriptionNumber}
            >
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium text-slate-800">
                  {subscription.subscriptionNumber || 'Subscription'}
                </span>
                <span className="block truncate text-xs text-slate-500">
                  {subscription.plan?.name || subscription.plan?.frequency || 'Plan'}
                </span>
              </span>
              <time className="shrink-0 text-sm text-slate-600">
                {new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(
                  new Date(subscription.nextBillingDate),
                )}
              </time>
            </li>
          ))}
        </ul>
      )}
      {truncated && (
        <p className="mt-3 text-xs text-amber-700">
          Only the first 100 active subscriptions are loaded; later records may
          have earlier billing dates.
        </p>
      )}
    </section>
  );
}

function CustomerDashboard({ getIdToken, user }) {
  const [historyPage, setHistoryPage] = useState(1);
  const { data, error, loading } = useDashboardData({
    getIdToken,
    page: historyPage,
    role: 'customer',
    user,
  });

  if (error) return <PageLoadError error={error} />;

  const active = data?.activeSubscriptions;
  return (
    <div className="space-y-7">
      <PageHeader
        description="Your subscriptions and billing information."
        eyebrow="Customer workspace"
        title="Dashboard"
      />

      <section aria-label="Your subscription summary" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <SummaryCard
          caption="Records returned by your customer-scoped API"
          icon={CreditCard}
          label="Subscription history"
          value={
            loading
              ? '…'
              : data?.recentSubscriptions?.status === 'success'
                ? data.recentSubscriptions.data.pagination.total.toLocaleString()
                : '—'
          }
        />
        <IntegrationPending
          description="An invoice API is not available. No other customer’s billing records are requested."
          title="Outstanding balance"
        />
        <IntegrationPending
          description="A payments API is not available. No other customer’s payment records are requested."
          title="Payment history"
        />
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <UpcomingBilling result={active} />
        <IntegrationPending
          description="Profile fields are provided by the authentication/profile integration, which is not connected in this checkout."
          title="Profile information"
        />
      </section>

      <RecentSubscriptions
        customerView
        loading={loading}
        onPageChange={setHistoryPage}
        paginated
        result={data?.recentSubscriptions}
        title="Subscription history"
      />

      <section className="grid gap-5 lg:grid-cols-2">
        <IntegrationPending
          description="Invoice records will appear after a customer-scoped invoice API is available."
          title="Invoices"
        />
        <IntegrationPending
          description="Payment records will appear after a customer-scoped payment API is available."
          title="Payment history"
        />
      </section>
    </div>
  );
}

export default function DashboardPage({
  expectedRole,
  getIdToken,
  user,
}) {
  if (!user || typeof user.role !== 'string') {
    return (
      <PageLoadError
        error={
          new Error(
            'The authenticated profile is not connected. Dashboard access requires the verified role from the authentication context.',
          )
        }
      />
    );
  }

  if (expectedRole && user.role !== expectedRole) {
    return (
      <PageLoadError
        error={
          new Error(
            `This dashboard is restricted to the ${expectedRole} role. Your authenticated role does not match.`,
          )
        }
      />
    );
  }

  if (user.role === 'admin') {
    return <AdminDashboard getIdToken={getIdToken} user={user} />;
  }
  if (user.role === 'staff') {
    return <StaffDashboard getIdToken={getIdToken} user={user} />;
  }
  if (user.role === 'customer') {
    return <CustomerDashboard getIdToken={getIdToken} user={user} />;
  }

  return (
    <PageLoadError
      error={
        new Error(
          `The authenticated role "${user.role}" does not have a dashboard.`,
        )
      }
    />
  );
}
