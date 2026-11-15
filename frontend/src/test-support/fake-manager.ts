import { ApiError } from '../api/api-client';
import type { UserRole } from '../api/types';

/** O código do gerente que o fake aceita na janela do caixa. */
export const FAKE_MANAGER_PIN = '135790';

/**
 * Como o backend (`ManagerPinAuthorizer`): admin passa direto; o caixa precisa mandar
 * `managerPassword` certo, senão 403 com o código que abre (ou avisa na) janela do código.
 *
 * @example requireFakeManager('CAIXA', { managerPassword: '135790' })
 */
export function requireFakeManager(role: UserRole, body: unknown): void {
  if (role === 'ADMIN') return;
  const password = (body as { managerPassword?: unknown } | undefined)
    ?.managerPassword;
  if (password === FAKE_MANAGER_PIN) return;
  if (password)
    throw new ApiError(
      403,
      'Código do gerente errado: esperado o código de um admin ativo',
      'MANAGER_DENIED',
    );
  throw new ApiError(
    403,
    'Esta ação precisa do código do gerente: esperado o campo "managerPassword"',
    'MANAGER_REQUIRED',
  );
}
