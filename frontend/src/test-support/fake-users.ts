import { ApiError, type HttpMethod } from '../api/api-client';
import type { UserSummary } from '../api/password-api';

/** Os usuários do fake, a senha atual do admin e o código do gerente. */
export interface FakeUserStore {
  users: UserSummary[];
  adminPassword: string;
  managerPin?: string | null;
}

export const FAKE_USERS: UserSummary[] = [
  { id: 1, name: 'Admin', username: 'admin', role: 'ADMIN', active: true },
  { id: 2, name: 'Caixa', username: 'caixa', role: 'CAIXA', active: true },
];

function validateManagerPin(pin: unknown): string {
  const value = String(pin ?? '');
  if (!/^\d{6}$/.test(value)) {
    throw new ApiError(
      400,
      'Código do gerente inválido: esperado exatamente 6 números',
    );
  }
  if (value === '123456' || value === '654321' || /^(\d)\1{5}$/.test(value)) {
    throw new ApiError(
      400,
      'Código do gerente óbvio: evite sequências ou números repetidos',
    );
  }
  return value;
}

function fakeManagerPinRoute(
  store: FakeUserStore,
  method: HttpMethod,
  body: Record<string, unknown>,
): unknown {
  if (method === 'GET') return { configured: Boolean(store.managerPin) };
  if (method === 'PUT') {
    if (body.currentPassword !== store.adminPassword) {
      throw new ApiError(
        401,
        'Senha atual incorreta: esperado o valor de "currentPassword"',
      );
    }
    store.managerPin = validateManagerPin(body.pin);
    return undefined;
  }
  return undefined;
}

/**
 * Rotas de usuários e senhas como o backend (2026-11-15):
 * `GET /users`, `POST /users/me/password`, `POST /users/:id/password`,
 * e `GET / PUT /users/me/manager-pin`.
 *
 * @example fakeUsersRoute(api, 'GET', '/users/me/manager-pin', {})
 */
export function fakeUsersRoute(
  store: FakeUserStore,
  method: HttpMethod,
  path: string,
  body: Record<string, unknown>,
): unknown {
  if (path === '/users/me/manager-pin') {
    return fakeManagerPinRoute(store, method, body);
  }
  if (method === 'GET') return store.users;
  if (path !== '/users/me/password') return undefined;
  if (body.currentPassword !== store.adminPassword) {
    throw new ApiError(
      401,
      'Senha atual incorreta: esperado o valor de "currentPassword"',
    );
  }
  store.adminPassword = String(body.newPassword);
  return undefined;
}
