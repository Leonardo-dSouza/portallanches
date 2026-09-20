import { Outlet } from 'react-router-dom';
import { useAuth } from '../auth/auth-context';

const ROLE_LABEL = { ADMIN: 'Administrador', CAIXA: 'Caixa' } as const;

/** Moldura das telas logadas: cabeçalho com usuário e botão de sair. */
export function AppShell() {
  const { user, logout } = useAuth();
  return (
    <div className="shell">
      <header className="shell-header">
        <strong className="brand">PortalLanches</strong>
        <span className="shell-user">
          {user?.name} · {user ? ROLE_LABEL[user.role] : ''}
        </span>
        <button
          type="button"
          className="button button-secondary"
          onClick={() => void logout()}
        >
          Sair
        </button>
      </header>
      <main className="shell-main">
        <Outlet />
      </main>
    </div>
  );
}
