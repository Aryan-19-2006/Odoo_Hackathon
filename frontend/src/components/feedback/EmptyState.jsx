import { Inbox } from 'lucide-react';
import Button from '../ui/Button.jsx';

export default function EmptyState({
  action,
  description,
  icon: Icon = Inbox,
  title = 'Nothing here yet',
}) {
  return (
    <div className="flex min-h-64 flex-col items-center justify-center px-6 py-12 text-center">
      <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
        <Icon aria-hidden="true" size={22} />
      </span>
      <h2 className="text-base font-semibold text-slate-900">{title}</h2>
      {description && (
        <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">{description}</p>
      )}
      {action?.onClick && (
        <Button className="mt-5" onClick={action.onClick} variant={action.variant}>
          {action.label}
        </Button>
      )}
    </div>
  );
}
