import { HttpException, HttpStatus } from '@nestjs/common';

/** Erros seguidos que travam a chave, e por quanto tempo (2026-10-15: senha na rede local). */
const MAX_FAILURES = 5;
const LOCK_MS = 5 * 60 * 1000;

interface AttemptState {
  failures: number;
  lockedUntil: number;
}

/**
 * Freio contra chute de senha (login e senha do admin no PC do caixa): 5 erros seguidos na
 * mesma chave travam ela por 5 min; um acerto zera. Em memória: reiniciar o servidor solta.
 *
 * @example limiter.assertAllowed('login:caixa'); … limiter.recordFailure('login:caixa');
 */
export class AttemptLimiter {
  private readonly attempts = new Map<string, AttemptState>();

  constructor(private readonly now: () => number) {}

  /** 429 enquanto a chave estiver travada, dizendo quanto falta. */
  assertAllowed(key: string): void {
    const lockedUntil = this.attempts.get(key)?.lockedUntil ?? 0;
    const waitMs = lockedUntil - this.now();
    if (waitMs <= 0) return;
    const minutes = Math.ceil(waitMs / 60_000);
    throw new HttpException(
      `Muitas tentativas erradas em "${key}": esperado aguardar ${minutes} min antes de tentar de novo`,
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }

  recordFailure(key: string): void {
    const failures = (this.attempts.get(key)?.failures ?? 0) + 1;
    const locked = failures >= MAX_FAILURES;
    this.attempts.set(key, {
      failures: locked ? 0 : failures,
      lockedUntil: locked ? this.now() + LOCK_MS : 0,
    });
  }

  recordSuccess(key: string): void {
    this.attempts.delete(key);
  }
}
