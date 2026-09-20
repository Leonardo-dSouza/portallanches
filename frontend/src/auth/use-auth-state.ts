import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ApiClient } from '../api/api-client';
import type { SessionUser } from '../api/types';
import type { AuthContextValue, AuthStatus } from './auth-context';
import {
  loginRequest,
  logoutRequest,
  restoreSession,
} from './session-requests';
import type { TokenStorage } from './token-storage';

export function useAuthState(
  api: ApiClient,
  storage: TokenStorage,
): AuthContextValue {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [status, setStatus] = useState<AuthStatus>(
    storage.read() ? 'loading' : 'anonymous',
  );

  const apply = useCallback((next: SessionUser | null) => {
    setUser(next);
    setStatus(next ? 'authenticated' : 'anonymous');
  }, []);

  useEffect(() => {
    if (storage.read()) void restoreSession(api, storage).then(apply);
  }, [api, storage, apply]);

  const login = useCallback(
    async (username: string, password: string) =>
      apply(await loginRequest(api, storage, username, password)),
    [api, storage, apply],
  );
  const logout = useCallback(async () => {
    await logoutRequest(api, storage);
    apply(null);
  }, [api, storage, apply]);

  return useMemo(
    () => ({ status, user, login, logout }),
    [status, user, login, logout],
  );
}
