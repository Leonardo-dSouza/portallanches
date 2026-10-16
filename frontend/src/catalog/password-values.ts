import type { Parsed } from './catalog-values';

/** O mesmo mínimo do backend (`users/users-input.ts`). */
const MIN_PASSWORD_LENGTH = 6;

/**
 * Senha nova digitada duas vezes: o mínimo de caracteres e as duas iguais. A mensagem nunca
 * repete a senha.
 *
 * @example parseNewPassword('nova123', 'nova123') // { ok: true, value: 'nova123' }
 */
export function parseNewPassword(
  typed: string,
  repeated: string,
): Parsed<string> {
  if (typed.length < MIN_PASSWORD_LENGTH)
    return {
      ok: false,
      error: `Senha nova curta: esperado pelo menos ${MIN_PASSWORD_LENGTH} caracteres`,
    };
  if (typed !== repeated)
    return {
      ok: false,
      error: 'As duas senhas novas não batem: digite a mesma nos dois campos',
    };
  return { ok: true, value: typed };
}
