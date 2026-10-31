import { AlertTriangle } from 'lucide-react';
import { getApiErrorMessage } from '../../services/apiError.js';
import Button from '../ui/Button.jsx';

export default function ErrorState({
  error,
  message,
  onRetry,
  title = 'Unable to load this content',
}) {
  const description = message || getApiErrorMessage(error);

  return (
    <div
      aria-live="assertive"
      className="flex min-h-40 flex-col items-center justify-center px-6 py-10 text-center"
      role="alert"
    >
      <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-rose-50 text-rose-600">
        <AlertTriangle aria-hidden="true" size={20} />
      </span>
      <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
      <p className="mt-1 max-w-md text-sm text-slate-500">{description}</p>
      {onRetry && (
        <Button className="mt-4" onClick={onRetry} variant="secondary">
          Try again
        </Button>
      )}
    </div>
  );
}
