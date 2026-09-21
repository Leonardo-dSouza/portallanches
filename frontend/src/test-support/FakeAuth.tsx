import type { ReactNode } from 'react';
import { AuthContext } from '../auth/auth-context';
import type { UserRole } from '../api/types';

/** Sessão fixa para telas que só precisam saber o papel do usuário logado. */
export function FakeAuth({
  role,
  children,
}: {
  role: UserRole;
  children: ReactNode;
}) {
  const value = {
    status: 'authenticated' as const,
    user: { id: 1, name: 'Fulano', role },
    login: async () => undefined,
    logout: async () => undefined,
  };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
