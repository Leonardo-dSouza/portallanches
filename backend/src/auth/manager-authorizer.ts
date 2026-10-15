import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { AttemptLimiter } from './attempt-limiter.js';
import { verifyPassword } from './password-hasher.js';
import { USER_REPOSITORY, type UserRepository } from './user-repository.js';

export const MANAGER_AUTHORIZER = Symbol('MANAGER_AUTHORIZER');

/** Código no corpo do 403: a tela abre a janela da senha (sem senha) ou avisa (senha errada). */
export const MANAGER_REQUIRED = 'MANAGER_REQUIRED';
export const MANAGER_DENIED = 'MANAGER_DENIED';

const LIMITER_KEY = 'senha do admin';

/**
 * A senha do admin digitada na hora no PC do caixa (2026-10-15): libera o que o perfil caixa
 * não faz sozinho (cancelar fora da trava, diminuir, trocar a forma de pagamento, reabrir).
 */
export interface ManagerAuthorizer {
  /** Passa calado se a senha é de um ADMIN ativo; senão 403 (com o código) ou 429. */
  authorize(password: unknown): Promise<void>;
}

/**
 * Confere contra todos os ADMIN ativos, com o mesmo freio de tentativas do login.
 *
 * @example await authorizer.authorize(body.managerPassword);
 */
@Injectable()
export class AdminPasswordAuthorizer implements ManagerAuthorizer {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(AttemptLimiter) private readonly limiter: AttemptLimiter,
  ) {}

  async authorize(password: unknown): Promise<void> {
    if (typeof password !== 'string' || password === '') {
      throw new ForbiddenException({
        statusCode: 403,
        code: MANAGER_REQUIRED,
        message:
          'Esta ação precisa da senha do admin: esperado o campo "managerPassword"',
      });
    }
    this.limiter.assertAllowed(LIMITER_KEY);
    const hashes = await this.users.listActiveAdminHashes();
    if (hashes.some((hash) => verifyPassword(password, hash))) {
      this.limiter.recordSuccess(LIMITER_KEY);
      return;
    }
    this.limiter.recordFailure(LIMITER_KEY);
    throw new ForbiddenException({
      statusCode: 403,
      code: MANAGER_DENIED,
      message:
        'Senha do admin errada: esperado a senha de um usuário ADMIN ativo',
    });
  }
}

/**
 * A senha do admin que veio no corpo da ação (o resto do corpo é de quem chamou).
 *
 * @example managerPasswordOf({ reason: 'desistiu', managerPassword: 'x' }) // 'x'
 */
export function managerPasswordOf(body: unknown): unknown {
  if (typeof body !== 'object' || body === null) return undefined;
  return (body as Record<string, unknown>).managerPassword;
}
