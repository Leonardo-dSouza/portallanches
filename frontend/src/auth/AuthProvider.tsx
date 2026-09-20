import type { ReactNode } from 'react';
import type { ApiClient } from '../api/api-client';
import { AuthContext } from './auth-context';
import type { TokenStorage } from './token-storage';
import { useAuthState } from './use-auth-state';

interface AuthProviderProps {
  api: ApiClient;
  storage: TokenStorage;
  children: ReactNode;
}

/** Restaura a sessão a partir do token salvo e expõe login/logout. API e storage são injetados. */
export function AuthProvider({ api, storage, children }: AuthProviderProps) {
  const value = useAuthState(api, storage);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
