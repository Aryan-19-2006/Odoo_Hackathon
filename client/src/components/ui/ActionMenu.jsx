import { useEffect, useId, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { MoreHorizontal } from 'lucide-react';
import Button from './Button.jsx';
import { classNames } from '../../utils/classNames.js';

export default function ActionMenu({
  align = 'left',
  ariaLabel = 'Open menu',
  children,
  className = 'w-56',
  closeOnContentClick = false,
  icon = MoreHorizontal,
  iconOnly,
  items = [],
  label,
  triggerClassName,
}) {
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const containerRef = useRef(null);
  const Icon = icon;
  const isIconOnly = iconOnly ?? !label;

  useEffect(() => {
    if (!open) return undefined;

    function handlePointerDown(event) {
      if (!containerRef.current?.contains(event.target)) setOpen(false);
    }

    function handleKeyDown(event) {
      if (event.key === 'Escape') setOpen(false);
    }

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  function renderItem(item, index) {
    if (item.disabled || (!item.to && typeof item.onSelect !== 'function')) return null;
    const ItemIcon = item.icon;
    const itemClassName = classNames(
      'flex w-full items-start gap-3 px-4 py-2.5 text-left text-sm transition-colors',
      item.destructive
        ? 'text-rose-700 hover:bg-rose-50'
        : 'text-slate-700 hover:bg-slate-50',
      item.disabled && 'pointer-events-none opacity-50',
    );
    const content = (
      <>
        {ItemIcon && (
          <ItemIcon
            aria-hidden="true"
            className={classNames('mt-0.5 shrink-0', item.destructive ? 'text-rose-600' : 'text-slate-400')}
            size={16}
          />
        )}
        <span className="min-w-0">
          <span className="block">{item.label}</span>
          {item.description && (
            <span className="mt-0.5 block text-xs leading-5 text-slate-500">
              {item.description}
            </span>
          )}
        </span>
      </>
    );

    if (item.to) {
      return (
        <Link
          className={itemClassName}
          key={item.id || item.label || index}
          onClick={() => setOpen(false)}
          to={item.to}
        >
          {content}
        </Link>
      );
    }

    return (
      <button
        className={itemClassName}
        disabled={item.disabled}
        key={item.id || item.label || index}
        onClick={() => {
          setOpen(false);
          item.onSelect();
        }}
        type="button"
      >
        {content}
      </button>
    );
  }

  return (
    <div className="relative" ref={containerRef}>
      <Button
        aria-controls={menuId}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={ariaLabel}
        className={classNames(
          'relative text-slate-500',
          isIconOnly ? 'h-10 w-10 p-0' : 'min-h-10 w-auto px-2',
          triggerClassName,
        )}
        onClick={() => setOpen((value) => !value)}
        variant="ghost"
      >
        {Icon && <Icon aria-hidden="true" size={18} />}
        {label}
      </Button>
      {open && (
        <div
          className={classNames(
            'absolute top-[calc(100%+0.5rem)] z-50 overflow-hidden rounded-xl border border-line bg-white shadow-popover',
            align === 'right' ? 'right-0' : 'left-0',
            className,
          )}
          id={menuId}
          onClick={(event) => {
            if (closeOnContentClick && event.target.closest('button')) setOpen(false);
          }}
          role="dialog"
        >
          {children}
          {items.length > 0 && (
            <div className={children ? 'border-t border-line py-1' : 'py-1'}>
              {items.map(renderItem)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
