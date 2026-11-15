import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import {
  REQUEST_ORIGIN,
  type RequestOrigin,
} from '../common/request-origin.js';
import { AttemptLimiter } from './attempt-limiter.js';
import { managerAttemptRules } from './attempt-rules.js';
import { verifyPassword } from './password-hasher.js';
import { SECURITY_LOG, type SecurityLog } from './security-log.js';
import { USER_REPOSITORY, type UserRepository } from './user-repository.js';

export const MANAGER_AUTHORIZER = Symbol('MANAGER_AUTHORIZER');

/** Código no corpo do 403: a tela abre a janela da senha (sem senha) ou avisa (senha errada). */
export const MANAGER_REQUIRED = 'MANAGER_REQUIRED';
export const MANAGER_DENIED = 'MANAGER_DENIED';

/**
 * A senha do admin digitada na hora no PC do caixa (2026-10-15): libera o que o perfil caixa
 * não faz sozinho (cancelar fora da trava, diminuir, trocar a forma de pagamento, reabrir).
 */
export interface ManagerAuthorizer {
  /** Passa calado se a senha é de um ADMIN ativo; senão 403 (com o código) ou 429. */
  authorize(password: unknown): Promise<void>;
}

/**
 * Confere contra todos os ADMIN ativos, com o mesmo freio de tentativas do login. Desde 2026-11-15 a
 * trava é por aparelho: antes era uma chave só, e qualquer sessão de caixa a mantinha fechada (S-06).
 *
 * @example await authorizer.authorize(body.managerPassword);
 */
@Injectable()
export class AdminPasswordAuthorizer implements ManagerAuthorizer {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(AttemptLimiter) private readonly limiter: AttemptLimiter,
    @Inject(REQUEST_ORIGIN) private readonly origin: RequestOrigin,
    @Inject(SECURITY_LOG) private readonly log: SecurityLog,
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
    const origin = this.origin();
    const matchedHash = await this.limiter.attempt(
      managerAttemptRules(origin),
      () => this.adminHashMatching(password),
    );
    if (matchedHash) return;
    this.log({ event: 'manager_denied', origin });
    throw new ForbiddenException({
      statusCode: 403,
      code: MANAGER_DENIED,
      message:
        'Senha do admin errada: esperado a senha de um usuário ADMIN ativo',
    });
  }

  private async adminHashMatching(password: string): Promise<string | null> {
    const hashes = await this.users.listActiveAdminHashes();
    return hashes.find((hash) => verifyPassword(password, hash)) ?? null;
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
