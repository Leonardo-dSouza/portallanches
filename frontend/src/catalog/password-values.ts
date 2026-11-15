import type { Parsed } from './catalog-values';

/** Os mesmos mínimos do backend (`auth/credential-rules.ts`, 2026-11-15): admin 10, caixa 8. */
export const MIN_PASSWORD_LENGTH = { ADMIN: 10, CAIXA: 8 } as const;

export type PasswordRole = keyof typeof MIN_PASSWORD_LENGTH;

/**
 * Senha nova digitada duas vezes: o mínimo do perfil e as duas iguais. A lista de senhas óbvias
 * fica no backend (a mensagem dele aparece na tela). A mensagem nunca repete a senha.
 *
 * @example parseNewPassword('cebola-roxa', 'cebola-roxa', 'CAIXA') // { ok: true, value: 'cebola-roxa' }
 */
export function parseNewPassword(
  typed: string,
  repeated: string,
  role: PasswordRole,
): Parsed<string> {
  const min = MIN_PASSWORD_LENGTH[role];
  if (typed.length < min)
    return {
      ok: false,
      error: `Senha nova curta: esperado pelo menos ${min} caracteres`,
    };
  if (typed !== repeated)
    return {
      ok: false,
      error: 'As duas senhas novas não batem: digite a mesma nos dois campos',
    };
  return { ok: true, value: typed };
}
