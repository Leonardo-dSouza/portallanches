import {
  ChartColumn,
  LogOut,
  Package,
  ReceiptText,
  ShoppingBasket,
  SlidersHorizontal,
  Utensils,
} from 'lucide-react';
import { useMemo } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useApi } from '../api/api-context';
import { createSettingsApi } from '../api/settings-api';
import { useAuth } from '../auth/auth-context';
import { AppSettingsProvider } from '../settings/AppSettingsProvider';

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
              <NavLink to="/analise">
                <ChartColumn aria-hidden />
                Análise
              </NavLink>
              {/* No celular (2026-11-05): Compras e Cadastros ficam escondidos na barra inferior
                  para o admin acessar apenas Caixa, Estoque e Análise sem superlotar o rodapé. */}
              <NavLink to="/compras" className="shell-nav-wide">
                <ShoppingBasket aria-hidden />
                Compras
              </NavLink>
              <NavLink to="/cadastros" className="shell-nav-wide">
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
          {/* No celular (2026-11-05): o rótulo vira sr-only para o botão caber como tecla de ícone
              no cabeçalho compacto, mantendo o nome acessível "Sair" para leitores de tela. */}
          <span className="shell-logout-text">Sair</span>
        </button>
      </header>
      <main className="shell-main">
        <AppSettingsProvider settings={settings}>
          <Outlet />
        </AppSettingsProvider>
      </main>
    </div>
  );
}
