import { LoaderCircle } from 'lucide-react';

export default function LoadingState({ label = 'Loading', className = '' }) {
  return (
    <div
      aria-live="polite"
      className={`flex min-h-40 flex-col items-center justify-center gap-3 text-sm text-slate-500 ${className}`}
      role="status"
    >
      <LoaderCircle aria-hidden="true" className="animate-spin text-brand-600" size={24} />
      <span>{label}</span>
    </div>
  );
}
