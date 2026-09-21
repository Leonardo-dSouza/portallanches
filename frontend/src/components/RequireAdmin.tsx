import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../auth/auth-context';

/** Rota só de admin (dentro de `RequireAuth`): o caixa volta para a tela do caixa. */
export function RequireAdmin() {
  const { user } = useAuth();
  if (user?.role !== 'ADMIN') return <Navigate to="/caixa" replace />;
  return <Outlet />;
}
