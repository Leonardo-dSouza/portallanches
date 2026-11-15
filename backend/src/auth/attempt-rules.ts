import type { AttemptRule } from './attempt-limiter.js';

/** Erros seguidos do mesmo usuário (ou da senha do admin) no mesmo aparelho antes de travar. */
const PER_DEVICE_MAX_FAILURES = 5;
/** Erros seguidos de um aparelho em qualquer usuário: segura quem chuta vários nomes (S-03). */
const PER_ORIGIN_MAX_FAILURES = 20;

function originRule(origin: string): AttemptRule {
  return { key: `aparelho:${origin}`, maxFailures: PER_ORIGIN_MAX_FAILURES };
}

/**
 * Chaves contadas no login: o usuário naquele aparelho e o aparelho inteiro. Quem chuta senha trava
 * só o próprio aparelho; o PC do balcão continua entrando (decisão do usuário, 2026-11-15).
 *
 * @example loginAttemptRules('caixa', '10.0.0.2') // [login:caixa@10.0.0.2 (5), aparelho:10.0.0.2 (20)]
 */
export function loginAttemptRules(
  username: string,
  origin: string,
): AttemptRule[] {
  return [
    {
      key: `login:${username}@${origin}`,
      maxFailures: PER_DEVICE_MAX_FAILURES,
    },
    originRule(origin),
  ];
}

/**
 * Chaves contadas na senha do admin digitada no caixa: a senha naquele aparelho e o aparelho.
 *
 * @example managerAttemptRules('10.0.0.2') // [gerente@10.0.0.2 (5), aparelho:10.0.0.2 (20)]
 */
export function managerAttemptRules(origin: string): AttemptRule[] {
  return [
    { key: `gerente@${origin}`, maxFailures: PER_DEVICE_MAX_FAILURES },
    originRule(origin),
  ];
}
