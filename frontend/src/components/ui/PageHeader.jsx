import { classNames } from '../../utils/classNames.js';
import Breadcrumbs from './Breadcrumbs.jsx';

export default function PageHeader({
  actions,
  breadcrumbs,
  className,
  description,
  eyebrow,
  title,
}) {
  return (
    <div className={className}>
      <Breadcrumbs items={breadcrumbs} />
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-2xl">
          {eyebrow && (
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-brand-700">
              {eyebrow}
            </p>
          )}
          <h1 className="text-2xl font-semibold tracking-tight text-navy-950 sm:text-[28px]">
            {title}
          </h1>
          {description && (
            <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
          )}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}
