import type { Parsed } from './catalog-values';

/**
 * Número digitado do aviso de saldo do caixa (mesmo limite do backend).
 *
 * @example parseStockWarning('6') // { ok: true, value: 6 }
 */
export function parseStockWarning(text: string): Parsed<number> {
  const typed = text.trim();
  if (/^\d{1,3}$/.test(typed)) return { ok: true, value: Number(typed) };
  return {
    ok: false,
    error: `Aviso de saldo inválido "${text}": esperado número inteiro de 0 a 999 (0 = nunca mostrar)`,
  };
}
