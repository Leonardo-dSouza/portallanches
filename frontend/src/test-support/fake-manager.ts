import { ApiError } from '../api/api-client';
import type { UserRole } from '../api/types';

/** A senha do admin que o fake aceita na janela do caixa. */
export const FAKE_ADMIN_PASSWORD = 'admin123';

/**
 * Como o backend (`AdminPasswordAuthorizer`): admin passa direto; o caixa precisa mandar
 * `managerPassword` certo, senão 403 com o código que abre (ou avisa na) janela da senha.
 *
 * @example requireFakeManager('CAIXA', { managerPassword: 'admin123' })
 */
export function requireFakeManager(role: UserRole, body: unknown): void {
  if (role === 'ADMIN') return;
  const password = (body as { managerPassword?: unknown } | undefined)
    ?.managerPassword;
  if (password === FAKE_ADMIN_PASSWORD) return;
  if (password)
    throw new ApiError(
      403,
      'Senha do admin errada: esperado a senha de um usuário ADMIN ativo',
      'MANAGER_DENIED',
    );
  throw new ApiError(
    403,
    'Esta ação precisa da senha do admin: esperado o campo "managerPassword"',
    'MANAGER_REQUIRED',
  );
}
