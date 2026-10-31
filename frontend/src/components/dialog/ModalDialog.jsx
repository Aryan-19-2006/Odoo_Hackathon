import { useEffect, useId, useRef } from 'react';
import { X } from 'lucide-react';
import Button from '../ui/Button.jsx';

export default function ModalDialog({
  children,
  description,
  onClose,
  open,
  title,
  size = 'md',
}) {
  const dialogRef = useRef(null);
  const titleId = useId();
  const descriptionId = description ? `${titleId}-description` : undefined;
  const widths = {
    sm: 'max-w-md',
    md: 'max-w-xl',
    lg: 'max-w-3xl',
  };

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return undefined;

    function handleCancel(event) {
      event.preventDefault();
      onClose?.();
    }

    dialog.addEventListener('cancel', handleCancel);
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();

    return () => dialog.removeEventListener('cancel', handleCancel);
  }, [onClose, open]);

  return (
    <dialog
      aria-describedby={descriptionId}
      aria-labelledby={titleId}
      className={`w-[calc(100%-2rem)] ${widths[size] || widths.md} rounded-2xl border border-line bg-white p-0 text-left shadow-popover backdrop:bg-slate-950/40`}
      onClick={(event) => {
        if (event.target === dialogRef.current) onClose?.();
      }}
      ref={dialogRef}
    >
      <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4 sm:px-6">
        <div>
          <h2 className="text-lg font-semibold text-navy-950" id={titleId}>
            {title}
          </h2>
          {description && (
            <p className="mt-1 text-sm leading-5 text-slate-500" id={descriptionId}>
              {description}
            </p>
          )}
        </div>
        <Button
          aria-label="Close dialog"
          className="-mr-2 -mt-2 shrink-0 text-slate-500"
          disabled={!onClose}
          onClick={onClose}
          size="sm"
          variant="ghost"
        >
          <X aria-hidden="true" size={18} />
        </Button>
      </div>
      <div className="max-h-[min(70vh,42rem)] overflow-y-auto p-5 sm:p-6">{children}</div>
    </dialog>
  );
}
