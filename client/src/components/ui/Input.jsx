import { useId } from 'react';
import { classNames } from '../../utils/classNames.js';

export default function Input({
  className,
  description,
  error,
  id,
  label,
  ...props
}) {
  const generatedId = useId();
  const inputId = id || generatedId;
  const descriptionId = description ? `${inputId}-description` : undefined;
  const errorId = error ? `${inputId}-error` : undefined;

  return (
    <div className="space-y-1.5">
      {label && (
        <label className="block text-sm font-medium text-slate-700" htmlFor={inputId}>
          {label}
        </label>
      )}
      <input
        aria-describedby={[descriptionId, errorId].filter(Boolean).join(' ') || undefined}
        aria-invalid={Boolean(error)}
        className={classNames(
          'min-h-10 w-full rounded-lg border bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:ring-4 focus:ring-brand-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500',
          error ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-100' : 'border-line',
          className,
        )}
        id={inputId}
        {...props}
      />
      {description && !error && (
        <p className="text-xs text-slate-500" id={descriptionId}>
          {description}
        </p>
      )}
      {error && (
        <p className="text-xs text-rose-600" id={errorId}>
          {error}
        </p>
      )}
    </div>
  );
}
