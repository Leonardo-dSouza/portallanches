import {
  History,
  LogOut,
  Package,
  ReceiptText,
  SlidersHorizontal,
  Utensils,
} from 'lucide-react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../auth/auth-context';

const ROLE_LABEL = { ADMIN: 'Administrador', CAIXA: 'Caixa' } as const;

/** Moldura das telas logadas: cabeçalho com usuário e botão de sair. */
export function AppShell() {
  const { user, logout } = useAuth();
  return (
    <div className="shell">
      <header className="shell-header">
        <strong className="brand">
          <span className="brand-mark">
            <Utensils aria-hidden />
          </span>
          PortalLanches
        </strong>
        <nav className="shell-nav" aria-label="Principal">
          <NavLink to="/caixa">
            <ReceiptText aria-hidden />
            Caixa
          </NavLink>
          <NavLink to="/estoque">
            <Package aria-hidden />
            Estoque
          </NavLink>
          {user?.role === 'ADMIN' && (
            <>
              <NavLink to="/historico">
                <History aria-hidden />
                Histórico
              </NavLink>
              <NavLink to="/cadastros">
                <SlidersHorizontal aria-hidden />
                Cadastros
              </NavLink>
            </>
          )}
        </nav>
        <span className="shell-user">
          {user?.name} · {user ? ROLE_LABEL[user.role] : ''}
        </span>
        <button
          type="button"
          className="button button-secondary"
          onClick={() => void logout()}
        >
          <LogOut aria-hidden />
          Sair
        </button>
      </header>
      <main className="shell-main">
        <Outlet />
      </main>
    </div>
  );
}
