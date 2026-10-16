import type { ApiClient } from './api-client';
import type { UserRole } from './types';

/** Usuário como `GET /users` devolve (só o admin lista). */
export interface UserSummary {
  id: number;
  name: string;
  username: string;
  role: UserRole;
  active: boolean;
}

/** Senhas pela tela (2026-10-15): a do admin logado (com a atual) e a do caixa (sem a atual). */
export interface PasswordApi {
  listUsers(): Promise<UserSummary[]>;
  /** Encerra as sessões do admin: depois é preciso entrar de novo. */
  changeOwnPassword(
    currentPassword: string,
    newPassword: string,
  ): Promise<void>;
  /** Encerra as sessões daquele usuário (o caixa entra de novo com a nova). */
  resetPassword(userId: number, newPassword: string): Promise<void>;
}

/** @example await createPasswordApi(api).resetPassword(2, 'nova123'); */
export function createPasswordApi(api: ApiClient): PasswordApi {
  return {
    listUsers: () => api.request('GET', '/users'),
    changeOwnPassword: (currentPassword, newPassword) =>
      api.request('POST', '/users/me/password', {
        currentPassword,
        newPassword,
      }),
    resetPassword: (userId, newPassword) =>
      api.request('POST', `/users/${userId}/password`, { newPassword }),
  };
}
