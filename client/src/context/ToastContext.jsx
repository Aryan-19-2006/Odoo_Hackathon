import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';
import Button from '../components/ui/Button.jsx';

export const ToastContext = createContext(null);

const toastStyles = {
  success: {
    icon: CheckCircle2,
    className: 'border-emerald-200 text-emerald-800',
    iconClassName: 'text-emerald-600',
    role: 'status',
  },
  error: {
    icon: AlertCircle,
    className: 'border-rose-200 text-rose-800',
    iconClassName: 'text-rose-600',
    role: 'alert',
  },
  info: {
    icon: Info,
    className: 'border-brand-100 text-slate-800',
    iconClassName: 'text-brand-600',
    role: 'status',
  },
};

function ToastItem({ toast, onDismiss }) {
  const style = toastStyles[toast.type];
  const Icon = style.icon;

  return (
    <div
      className={`flex items-start gap-3 rounded-xl border bg-white p-4 shadow-popover ${style.className}`}
      role={style.role}
    >
      <Icon aria-hidden="true" className={`mt-0.5 shrink-0 ${style.iconClassName}`} size={18} />
      <p className="min-w-0 flex-1 text-sm leading-5">{toast.message}</p>
      <Button
        aria-label="Dismiss notification"
        className="-mr-2 -mt-2 shrink-0 text-slate-400 hover:text-slate-700"
        onClick={() => onDismiss(toast.id)}
        size="sm"
        variant="ghost"
      >
        <X aria-hidden="true" size={16} />
      </Button>
    </div>
  );
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timers = useRef(new Map());
  const nextId = useRef(0);

  const dismiss = useCallback((id) => {
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const notify = useCallback(
    (type, message, duration = 5000) => {
      if (typeof message !== 'string' || !message.trim()) {
        throw new TypeError('Toast notifications require a non-empty message.');
      }

      const id = ++nextId.current;
      setToasts((current) => [...current, { id, type, message }]);

      if (duration > 0) {
        timers.current.set(id, setTimeout(() => dismiss(id), duration));
      }

      return id;
    },
    [dismiss],
  );

  useEffect(
    () => () => {
      timers.current.forEach(clearTimeout);
      timers.current.clear();
    },
    [],
  );

  const value = useMemo(
    () => ({
      toast: {
        success: (message, duration) => notify('success', message, duration),
        error: (message, duration) => notify('error', message, duration),
        info: (message, duration) => notify('info', message, duration),
      },
      dismiss,
    }),
    [dismiss, notify],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-label="Notifications"
        className="fixed right-4 top-4 z-[100] flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-3"
      >
        {toasts.map((toast) => (
          <ToastItem key={toast.id} onDismiss={dismiss} toast={toast} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}
