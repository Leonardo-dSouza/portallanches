import { ApiError, type HttpMethod } from '../api/api-client';
import type { UserSummary } from '../api/password-api';

/** Os usuários do fake e a senha atual do admin. */
export interface FakeUserStore {
  users: UserSummary[];
  adminPassword: string;
}

export const FAKE_USERS: UserSummary[] = [
  { id: 1, name: 'Admin', username: 'admin', role: 'ADMIN', active: true },
  { id: 2, name: 'Caixa', username: 'caixa', role: 'CAIXA', active: true },
];

/**
 * `GET /users`, `POST /users/me/password` e `POST /users/:id/password` como o backend: a troca
 * da própria senha confere a atual (401 errada).
 *
 * @example fakeUsersRoute(api, 'POST', '/users/2/password', { newPassword: 'nova123' })
 */
export function fakeUsersRoute(
  store: FakeUserStore,
  method: HttpMethod,
  path: string,
  body: Record<string, unknown>,
): unknown {
  if (method === 'GET') return store.users;
  if (path !== '/users/me/password') return undefined;
  if (body.currentPassword !== store.adminPassword)
    throw new ApiError(
      401,
      'Senha atual incorreta: esperado o valor de "currentPassword"',
    );
  store.adminPassword = String(body.newPassword);
  return undefined;
}
