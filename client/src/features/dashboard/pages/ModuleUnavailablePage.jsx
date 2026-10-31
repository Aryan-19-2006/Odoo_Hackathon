import { Link, useParams } from 'react-router-dom';
import { Boxes } from 'lucide-react';
import EmptyState from '../../../components/feedback/EmptyState.jsx';
import PageHeader from '../../../components/ui/PageHeader.jsx';
import Button from '../../../components/ui/Button.jsx';

const moduleLabels = {
  users: 'Users',
  staff: 'Staff',
  customers: 'Customers',
  products: 'Products',
  variants: 'Product variants',
  plans: 'Plans',
  'quotation-templates': 'Quotation templates',
  quotations: 'Quotations',
  subscriptions: 'Subscriptions',
  invoices: 'Invoices',
  payments: 'Payments',
  discounts: 'Discounts',
  taxes: 'Taxes',
  analytics: 'Analytics',
  profile: 'Profile',
  settings: 'Settings',
};

export default function ModuleUnavailablePage({ user }) {
  const { moduleId } = useParams();
  const label = moduleLabels[moduleId];
  const dashboardPath =
    user?.role === 'admin'
      ? '/admin/dashboard'
      : user?.role === 'staff'
        ? '/staff/dashboard'
        : user?.role === 'customer'
          ? '/customer/dashboard'
          : '/';

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[
          { label: 'Dashboard', to: '/' },
          { label: label || 'Module' },
        ]}
        title={label || 'Module'}
        description="This destination is shown in navigation, but its API-backed module page has not been implemented."
      />
      <section className="rounded-card border border-line bg-white shadow-card">
        <EmptyState
          icon={Boxes}
          title={`${label || 'This module'} is not connected`}
          description="No records or sample data are displayed until the module API and page are available."
        />
        <div className="-mt-8 pb-8 text-center">
          <Button as={Link} to={dashboardPath} variant="secondary">
            Return to dashboard
          </Button>
        </div>
      </section>
    </div>
  );
}
