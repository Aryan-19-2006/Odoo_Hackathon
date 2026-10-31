import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { classNames } from '../../utils/classNames.js';

export default function SummaryCard({
  caption,
  icon: Icon,
  label,
  trend,
  value,
}) {
  const isPositive = trend?.direction === 'up';
  const isNegative = trend?.direction === 'down';
  const TrendIcon = isPositive ? ArrowUpRight : ArrowDownRight;

  return (
    <section className="rounded-card border border-line bg-white p-5 shadow-card sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-3 truncate text-2xl font-semibold tracking-tight text-navy-950">
            {value ?? '—'}
          </p>
        </div>
        {Icon && (
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
            <Icon aria-hidden="true" size={19} />
          </span>
        )}
      </div>
      {(caption || trend) && (
        <div className="mt-4 flex min-h-5 items-center gap-1.5 text-xs">
          {trend && (
            <>
              <TrendIcon
                aria-hidden="true"
                className={isPositive ? 'text-emerald-600' : isNegative ? 'text-rose-600' : 'text-slate-400'}
                size={15}
              />
              <span className={classNames('font-medium', isPositive ? 'text-emerald-700' : isNegative ? 'text-rose-700' : 'text-slate-500')}>
                {trend.value}
              </span>
            </>
          )}
          {caption && <span className="text-slate-500">{caption}</span>}
        </div>
      )}
    </section>
  );
}
