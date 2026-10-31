import { ToastProvider } from './context/ToastContext.jsx';
import AppRouter from './routes/AppRouter.jsx';

export default function App(props) {
  return (
    <ToastProvider>
      <AppRouter {...props} />
    </ToastProvider>
  );
}
