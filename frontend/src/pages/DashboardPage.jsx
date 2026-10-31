import { BarChart3 } from 'lucide-react';
import EmptyState from '../components/feedback/EmptyState.jsx';
import PageHeader from '../components/ui/PageHeader.jsx';

export default function DashboardPage() {
  return (
    <div className="space-y-7">
      <PageHeader
        title="Analytics overview"
        description="Monitor subscription performance and business trends."
      />
      <section
        aria-label="Analytics overview"
        className="rounded-card border border-line bg-white shadow-card"
      >
        <EmptyState
          icon={BarChart3}
          title="Analytics are not connected yet"
          description="Once the analytics API is available, this page will show real metrics. No sample business data is displayed."
        />
      </section>
    </div>
  );
}
