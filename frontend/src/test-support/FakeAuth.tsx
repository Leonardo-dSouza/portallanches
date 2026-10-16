import type { ReactNode } from 'react';
import { AuthContext } from '../auth/auth-context';
import type { UserRole } from '../api/types';

/** Sessão fixa para telas que só precisam saber o papel do usuário logado. */
export function FakeAuth({
  role,
  children,
  onLogout,
}: {
  role: UserRole;
  children: ReactNode;
  /** Para o teste saber que a tela mandou sair (ex.: depois de trocar a senha do admin). */
  onLogout?: () => void;
}) {
  const value = {
    status: 'authenticated' as const,
    user: { id: 1, name: 'Fulano', role },
    login: async () => undefined,
    logout: async () => onLogout?.(),
  };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
