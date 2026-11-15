/** Tentativa recusada que vale registrar: até 2026-11-15 ninguém ficava sabendo de um ataque (S-19). */
export interface SecurityEvent {
  event: 'login_failed' | 'manager_denied';
  origin: string;
  /** Só no login; já passou pelo padrão de nome de usuário, então é curto e sem quebra de linha. */
  username?: string;
}

/** Nunca recebe a senha. */
export type SecurityLog = (entry: SecurityEvent) => void;

export const SECURITY_LOG = Symbol('SECURITY_LOG');

/**
 * Uma linha JSON por evento no log do contêiner (`docker compose logs backend`).
 *
 * @example jsonSecurityLog({ event: 'login_failed', origin: '10.0.0.2', username: 'caixa' })
 */
export const jsonSecurityLog: SecurityLog = (entry) =>
  console.warn(JSON.stringify({ ...entry, at: new Date().toISOString() }));
