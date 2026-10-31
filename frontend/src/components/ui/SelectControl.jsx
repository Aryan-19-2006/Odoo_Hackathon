import { useId } from 'react';
import { ChevronDown } from 'lucide-react';
import { classNames } from '../../utils/classNames.js';

export default function SelectControl({
  className,
  description,
  error,
  id,
  label,
  options = [],
  placeholder,
  ...props
}) {
  const generatedId = useId();
  const selectId = id || generatedId;

  return (
    <div className="space-y-1.5">
      {label && (
        <label className="block text-sm font-medium text-slate-700" htmlFor={selectId}>
          {label}
        </label>
      )}
      <div className="relative">
        <select
          aria-describedby={error ? `${selectId}-error` : description ? `${selectId}-description` : undefined}
          aria-invalid={Boolean(error)}
          className={classNames(
            'min-h-10 w-full appearance-none rounded-lg border bg-white py-2 pl-3 pr-9 text-sm text-slate-900 shadow-sm outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-100 disabled:cursor-not-allowed disabled:bg-slate-50',
            error ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-100' : 'border-line',
            className,
          )}
          disabled={props.disabled || options.length === 0}
          id={selectId}
          {...props}
        >
          {placeholder && (
            <option disabled value="">
              {placeholder}
            </option>
          )}
          {options.map((option) => (
            <option
              disabled={option.disabled}
              key={option.value}
              value={option.value}
            >
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown
          aria-hidden="true"
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
          size={16}
        />
      </div>
      {description && !error && (
        <p className="text-xs text-slate-500" id={`${selectId}-description`}>
          {description}
        </p>
      )}
      {error && (
        <p className="text-xs text-rose-600" id={`${selectId}-error`}>
          {error}
        </p>
      )}
    </div>
  );
}
