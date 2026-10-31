import { forwardRef } from 'react';
import { LoaderCircle } from 'lucide-react';
import { classNames } from '../../utils/classNames.js';

const variants = {
  primary:
    'border-transparent bg-brand-600 text-white shadow-sm hover:bg-brand-700 focus-visible:ring-brand-500',
  secondary:
    'border-line bg-white text-slate-700 shadow-sm hover:bg-slate-50 focus-visible:ring-brand-500',
  ghost:
    'border-transparent bg-transparent text-slate-600 hover:bg-slate-100 focus-visible:ring-brand-500',
  danger:
    'border-transparent bg-rose-600 text-white shadow-sm hover:bg-rose-700 focus-visible:ring-rose-500',
};

const sizes = {
  sm: 'min-h-8 px-3 text-xs',
  md: 'min-h-10 px-4 text-sm',
};

const Button = forwardRef(function Button(
  {
    as: Component = 'button',
    children,
    className,
    disabled = false,
    loading = false,
    size = 'md',
    type = 'button',
    variant = 'primary',
    ...props
  },
  ref,
) {
  return (
    <Component
      className={classNames(
        'inline-flex items-center justify-center gap-2 rounded-lg border font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
        variants[variant] || variants.primary,
        sizes[size] || sizes.md,
        className,
      )}
      disabled={disabled || loading}
      ref={ref}
      type={Component === 'button' ? type : undefined}
      {...props}
    >
      {loading && <LoaderCircle aria-hidden="true" className="animate-spin" size={16} />}
      {children}
    </Component>
  );
});

export default Button;
