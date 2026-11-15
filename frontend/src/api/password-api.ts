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
  /** Se o admin logado já tem código do gerente cadastrado (2026-11-15). */
  managerPinStatus(): Promise<{ configured: boolean }>;
  /** Cadastra ou altera o código do gerente (6 números) do admin logado. */
  setManagerPin(currentPassword: string, pin: string): Promise<void>;
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
    managerPinStatus: () => api.request('GET', '/users/me/manager-pin'),
    setManagerPin: (currentPassword, pin) =>
      api.request('PUT', '/users/me/manager-pin', { currentPassword, pin }),
  };
}
