import type { ApiClient } from '../api/api-client';
import type { LoginResult, SessionUser } from '../api/types';
import type { TokenStorage } from './token-storage';

/** Tenta recuperar o usuário do token salvo; token inválido/expirado é descartado. */
export async function restoreSession(
  api: ApiClient,
  storage: TokenStorage,
): Promise<SessionUser | null> {
  try {
    return await api.request<SessionUser>('GET', '/auth/me');
  } catch {
    storage.clear();
    return null;
  }
}

export async function loginRequest(
  api: ApiClient,
  storage: TokenStorage,
  username: string,
  password: string,
): Promise<SessionUser> {
  const result = await api.request<LoginResult>('POST', '/auth/login', {
    username,
    password,
  });
  storage.write(result.token);
  return result.user;
}

/** O token local sempre é descartado, mesmo que a API falhe (ex.: sessão já expirada). */
export async function logoutRequest(
  api: ApiClient,
  storage: TokenStorage,
): Promise<void> {
  await api.request('POST', '/auth/logout').catch(() => undefined);
  storage.clear();
}
