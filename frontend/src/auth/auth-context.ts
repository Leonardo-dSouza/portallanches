import { createContext, useContext } from 'react';
import type { SessionUser } from '../api/types';

export type AuthStatus = 'loading' | 'anonymous' | 'authenticated';

export interface AuthContextValue {
  status: AuthStatus;
  user: SessionUser | null;
  login(username: string, password: string): Promise<void>;
  logout(): Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

/** @example const { user, logout } = useAuth(); */
export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value)
    throw new Error(
      'useAuth usado fora de <AuthProvider>: envolva a árvore com o provider',
    );
  return value;
}
