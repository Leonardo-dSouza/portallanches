/** Quanto do valor recebido volta na mensagem de erro. */
const MAX_ECHO_LENGTH = 200;

/**
 * O valor recebido como aparece na mensagem de erro, cortado em 200 caracteres. Até 2026-11-15 a
 * mensagem devolvia a entrada inteira: um campo de 1 MB voltava inteiro na resposta (S-19).
 *
 * @example describeReceived('abc') // '"abc"'
 * @example describeReceived('x'.repeat(5000)) // '"xxx…xx…" (5002 caracteres)'
 */
export function describeReceived(raw: unknown): string {
  const text = JSON.stringify(raw) ?? String(raw);
  if (text.length <= MAX_ECHO_LENGTH) return text;
  return `${text.slice(0, MAX_ECHO_LENGTH)}… (${text.length} caracteres)`;
}
