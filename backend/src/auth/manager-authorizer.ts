import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import {
  REQUEST_ORIGIN,
  type RequestOrigin,
} from '../common/request-origin.js';
import { AttemptLimiter } from './attempt-limiter.js';
import { managerAttemptRules } from './attempt-rules.js';
import { verifyPassword } from './password-hasher.js';
import { SECURITY_LOG, type SecurityLog } from './security-log.js';
import {
  USER_REPOSITORY,
  type AdminPin,
  type UserRepository,
} from './user-repository.js';

export const MANAGER_AUTHORIZER = Symbol('MANAGER_AUTHORIZER');

/** Código no corpo do 403: a tela abre a janela da senha (sem senha) ou avisa (senha errada). */
export const MANAGER_REQUIRED = 'MANAGER_REQUIRED';
export const MANAGER_DENIED = 'MANAGER_DENIED';

/**
 * O código do gerente digitado na hora no PC do caixa: libera o que o perfil caixa não faz sozinho
 * (cancelar fora da trava, diminuir, trocar a forma de pagamento, reabrir, estornar fiado). Até
 * 2026-11-15 era a senha de login do admin, que o caixa conseguia testar pela trava (S-04).
 */
export interface ManagerAuthorizer {
  /** Devolve o id do admin dono do código; senão 403 (com o código da tela) ou 429. */
  authorize(pin: unknown): Promise<number>;
}

function managerRequired(): ForbiddenException {
  return new ForbiddenException({
    statusCode: 403,
    code: MANAGER_REQUIRED,
    message:
      'Esta ação precisa do código do gerente: esperado o campo "managerPassword"',
  });
}

function managerDenied(message: string): ForbiddenException {
  return new ForbiddenException({
    statusCode: 403,
    code: MANAGER_DENIED,
    message,
  });
}

/**
 * Confere o código contra o de cada ADMIN ativo, com o mesmo freio de tentativas do login, por
 * aparelho. Sem nenhum código cadastrado nada passa: a senha de login não vale mais aqui.
 *
 * @example const adminId = await authorizer.authorize(body.managerPassword);
 */
@Injectable()
export class ManagerPinAuthorizer implements ManagerAuthorizer {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(AttemptLimiter) private readonly limiter: AttemptLimiter,
    @Inject(REQUEST_ORIGIN) private readonly origin: RequestOrigin,
    @Inject(SECURITY_LOG) private readonly log: SecurityLog,
  ) {}

  async authorize(pin: unknown): Promise<number> {
    if (typeof pin !== 'string' || pin === '') throw managerRequired();
    const pins = await this.users.listActiveAdminPins();
    if (pins.length === 0)
      throw managerDenied(
        'Nenhum código do gerente cadastrado: o admin cadastra em Cadastros → Senhas',
      );
    const origin = this.origin();
    const adminId = await this.limiter.attempt(
      managerAttemptRules(origin),
      () => ownerOfPin(pin, pins),
    );
    if (adminId !== null) return adminId;
    this.log({ event: 'manager_denied', origin });
    throw managerDenied(
      'Código do gerente errado: esperado o código de 6 números de um admin ativo',
    );
  }
}

/** O admin dono do código digitado, ou null. Confere todos para o tempo não dizer qual bateu. */
async function ownerOfPin(
  pin: string,
  pins: readonly AdminPin[],
): Promise<number | null> {
  const matches = await Promise.all(
    pins.map((admin) => verifyPassword(pin, admin.pinHash)),
  );
  const index = matches.indexOf(true);
  return index === -1 ? null : pins[index].userId;
}

/**
 * O código do gerente que veio no corpo da ação (o resto do corpo é de quem chamou). O campo segue
 * `managerPassword` desde a senha do admin (2026-10-15), para o front não mudar o formato.
 *
 * @example managerPasswordOf({ reason: 'desistiu', managerPassword: 'x' }) // 'x'
 */
export function managerPasswordOf(body: unknown): unknown {
  if (typeof body !== 'object' || body === null) return undefined;
  return (body as Record<string, unknown>).managerPassword;
}
