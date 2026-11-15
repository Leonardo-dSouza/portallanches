import { UnauthorizedException } from '@nestjs/common';
import { verifyPassword } from '../auth/password-hasher.js';
import type { UsersRepository } from './users-repository.js';

/**
 * Confere a senha atual de quem está logado antes de uma troca sensível (a própria senha, o código
 * do gerente): com só o token, ninguém troca nada disso.
 *
 * @example await assertCurrentPassword(users, 1, body.currentPassword);
 */
export async function assertCurrentPassword(
  users: UsersRepository,
  userId: number,
  raw: unknown,
): Promise<void> {
  const storedHash = await users.findPasswordHash(userId);
  const current = typeof raw === 'string' ? raw : '';
  if (storedHash && (await verifyPassword(current, storedHash))) return;
  throw new UnauthorizedException(
    'Senha atual incorreta: esperado o valor de "currentPassword"',
  );
}
