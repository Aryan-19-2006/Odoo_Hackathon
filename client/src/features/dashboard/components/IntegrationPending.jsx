import { CircleHelp } from 'lucide-react';
import Card from '../../../components/ui/Card.jsx';

export default function IntegrationPending({
  description,
  title,
}) {
  return (
    <Card className="flex min-h-40 items-start gap-3 p-5">
      <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
        <CircleHelp aria-hidden="true" size={18} />
      </span>
      <div>
        <h2 className="text-sm font-semibold text-slate-800">{title}</h2>
        <p className="mt-1 text-sm leading-5 text-slate-500">{description}</p>
        <p className="mt-3 text-xs font-medium text-slate-400">
          Not connected — no sample data shown
        </p>
      </div>
    </Card>
  );
}
