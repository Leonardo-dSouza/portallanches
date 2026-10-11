import {
  ChartColumn,
  History,
  LogOut,
  Package,
  ReceiptText,
  SlidersHorizontal,
  Utensils,
} from 'lucide-react';
import { useMemo } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useApi } from '../api/api-context';
import { createSettingsApi } from '../api/settings-api';
import { useAuth } from '../auth/auth-context';
import { TicketSettingsProvider } from '../print/TicketSettingsProvider';

const ROLE_LABEL = { ADMIN: 'Administrador', CAIXA: 'Caixa' } as const;

/**
 * Moldura das telas logadas: cabeçalho com usuário e botão de sair. Lê as configurações da
 * comanda (marca do artesanal e abreviações) para todas as telas.
 */
export function AppShell() {
  const { user, logout } = useAuth();
  const api = useApi();
  const settings = useMemo(() => createSettingsApi(api), [api]);
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
              <NavLink to="/analise">
                <ChartColumn aria-hidden />
                Análise
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
        <TicketSettingsProvider settings={settings}>
          <Outlet />
        </TicketSettingsProvider>
      </main>
    </div>
  );
}
