import { HttpException, HttpStatus } from '@nestjs/common';

/** Duração de cada trava seguida da mesma chave (2026-11-15, S-03): 5, 15 e depois sempre 60 min. */
const LOCK_STEPS_MS = [5, 15, 60].map((minutes) => minutes * 60_000);
/** Sem erro novo por 24 h, a chave é esquecida e a escada de travas volta ao começo. */
const FORGET_AFTER_MS = 24 * 60 * 60_000;
/** Teto de chaves em memória (S-06): acima dele saem as esquecidas e depois as mais antigas. */
const DEFAULT_MAX_KEYS = 10_000;

/** Uma chave contada na tentativa e quantos erros seguidos ela aguenta antes de travar. */
export interface AttemptRule {
  key: string;
  maxFailures: number;
}

interface AttemptState {
  failures: number;
  /** Tentativas que já passaram pela conferência e ainda não terminaram. */
  pending: number;
  lockedUntil: number;
  /** Travas tomadas desde o último acerto: escolhe o degrau em `LOCK_STEPS_MS`. */
  locks: number;
  lastFailureAt: number;
}

const freshState = (): AttemptState => ({
  failures: 0,
  pending: 0,
  lockedUntil: 0,
  locks: 0,
  lastFailureAt: 0,
});

function tooManyAttempts(waitMs: number): HttpException {
  const minutes = Math.ceil(waitMs / 60_000);
  return new HttpException(
    `Muitas tentativas erradas neste aparelho: esperado aguardar ${minutes} min antes de tentar de novo`,
    HttpStatus.TOO_MANY_REQUESTS,
  );
}

function attemptsInFlight(maxFailures: number): HttpException {
  return new HttpException(
    `Já há ${maxFailures} tentativas em andamento neste aparelho: esperado aguardar a resposta delas`,
    HttpStatus.TOO_MANY_REQUESTS,
  );
}

/**
 * Freio contra chute de senha (login e senha do admin no PC do caixa). Cada tentativa conta em
 * várias chaves ao mesmo tempo (ex.: usuário no aparelho e o aparelho inteiro); errar o máximo de
 * vezes seguidas trava a chave, e um acerto zera todas. Em memória: reiniciar o servidor solta.
 *
 * A vaga é reservada antes do `await` da conferência: até 2026-11-15 a conferência vinha antes do
 * banco, e 40 pedidos em paralelo passavam juntos (S-03 do mapa de segurança).
 *
 * @example const user = await limiter.attempt(rules, () => findUserWithPassword());
 */
export class AttemptLimiter {
  private readonly attempts = new Map<string, AttemptState>();

  constructor(
    private readonly now: () => number,
    private readonly maxKeys = DEFAULT_MAX_KEYS,
  ) {}

  /**
   * Roda `check` contando a tentativa em todas as regras. Resultado não nulo = acerto (zera as
   * chaves); nulo = erro (conta). Se `check` lançar, a vaga é devolvida sem contar. 429 se alguma
   * chave estiver travada ou já tiver o máximo de tentativas em andamento.
   *
   * @example await limiter.attempt([{ key: 'login:caixa@10.0.0.2', maxFailures: 5 }], check)
   */
  async attempt<T>(
    rules: readonly AttemptRule[],
    check: () => Promise<T | null>,
  ): Promise<T | null> {
    this.reserve(rules);
    let result: T | null;
    try {
      result = await check();
    } catch (error) {
      rules.forEach((rule) => this.release(rule.key));
      throw error;
    }
    for (const rule of rules) {
      if (result === null) this.fail(rule);
      else this.succeed(rule.key);
    }
    return result;
  }

  /** Quantas chaves estão guardadas (para o teste do teto). */
  get size(): number {
    return this.attempts.size;
  }

  private reserve(rules: readonly AttemptRule[]): void {
    this.makeRoom();
    const states = rules.map((rule) => this.stateOf(rule.key));
    rules.forEach((rule, index) => this.assertOpen(rule, states[index]));
    rules.forEach((rule, index) => {
      states[index].pending += 1;
      this.attempts.set(rule.key, states[index]);
    });
  }

  private assertOpen(rule: AttemptRule, state: AttemptState): void {
    const waitMs = state.lockedUntil - this.now();
    if (waitMs > 0) throw tooManyAttempts(waitMs);
    if (state.failures + state.pending >= rule.maxFailures)
      throw attemptsInFlight(rule.maxFailures);
  }

  /** Nunca apaga uma trava em vigor: só a estende (antes, um erro atrasado gravava `lockedUntil: 0`). */
  private fail(rule: AttemptRule): void {
    const state = this.stateOf(rule.key);
    state.pending = Math.max(0, state.pending - 1);
    state.failures += 1;
    state.lastFailureAt = this.now();
    if (state.failures >= rule.maxFailures) this.lock(state);
    this.attempts.set(rule.key, state);
  }

  private lock(state: AttemptState): void {
    const step = LOCK_STEPS_MS[Math.min(state.locks, LOCK_STEPS_MS.length - 1)];
    state.lockedUntil = Math.max(state.lockedUntil, this.now() + step);
    state.locks += 1;
    state.failures = 0;
  }

  private succeed(key: string): void {
    const pending = Math.max(0, (this.attempts.get(key)?.pending ?? 0) - 1);
    if (pending === 0) this.attempts.delete(key);
    else this.attempts.set(key, { ...freshState(), pending });
  }

  private release(key: string): void {
    const state = this.attempts.get(key);
    if (!state) return;
    state.pending = Math.max(0, state.pending - 1);
    if (this.isForgettable(state)) this.attempts.delete(key);
  }

  private stateOf(key: string): AttemptState {
    const state = this.attempts.get(key);
    if (!state || this.isForgettable(state)) return freshState();
    return state;
  }

  private isForgettable(state: AttemptState): boolean {
    return (
      this.isIdle(state) && this.now() - state.lastFailureAt >= FORGET_AFTER_MS
    );
  }

  /**
   * Abaixo do teto não faz nada; acima, tira as esquecidas e, se faltar, as mais antigas sem trava
   * nem tentativa em andamento. Uma trava em vigor nunca sai (senão encher o mapa a soltaria).
   */
  private makeRoom(): void {
    if (this.attempts.size < this.maxKeys) return;
    for (const [key, state] of this.attempts)
      if (this.isForgettable(state)) this.attempts.delete(key);
    for (const [key, state] of this.attempts) {
      if (this.attempts.size < this.maxKeys) return;
      if (this.isIdle(state)) this.attempts.delete(key);
    }
  }

  private isIdle(state: AttemptState): boolean {
    return state.pending === 0 && state.lockedUntil <= this.now();
  }
}
