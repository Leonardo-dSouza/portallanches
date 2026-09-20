import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/auth-context';
import { LoginForm } from './LoginForm';

interface LocationState {
  from?: string;
}

export function LoginPage() {
  const { status } = useAuth();
  const from = (useLocation().state as LocationState | null)?.from ?? '/';
  if (status === 'authenticated') return <Navigate to={from} replace />;
  return (
    <main className="login">
      <LoginForm />
    </main>
  );
}
