import { useEffect, useRef } from 'react';
import Button from '../ui/Button.jsx';

export default function ConfirmationDialog({
  cancelLabel = 'Cancel',
  confirmLabel = 'Confirm',
  description,
  loading = false,
  onCancel,
  onConfirm,
  open,
  title,
  tone = 'primary',
}) {
  const dialogRef = useRef(null);
  const canCancel = typeof onCancel === 'function';
  const canConfirm = typeof onConfirm === 'function';

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  return (
    <dialog
      aria-describedby="confirmation-description"
      aria-labelledby="confirmation-title"
      className="w-[min(28rem,calc(100%-2rem))] rounded-2xl border border-line bg-white p-0 text-left shadow-popover backdrop:bg-slate-950/40"
      onCancel={(event) => {
        event.preventDefault();
        if (!loading && canCancel) onCancel();
      }}
      ref={dialogRef}
    >
      <div className="p-6">
        <h2 className="text-lg font-semibold text-navy-950" id="confirmation-title">
          {title}
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-600" id="confirmation-description">
          {description}
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <Button disabled={loading || !canCancel} onClick={onCancel} variant="secondary">
            {cancelLabel}
          </Button>
          <Button
            loading={loading}
            disabled={!canConfirm}
            onClick={onConfirm}
            variant={tone === 'danger' ? 'danger' : 'primary'}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </dialog>
  );
}
