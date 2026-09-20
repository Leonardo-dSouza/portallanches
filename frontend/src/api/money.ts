const TYPED_MONEY = /^\d+([.,]\d{1,2})?$/;
const THOUSANDS = /\B(?=(\d{3})+(?!\d))/g;

/**
 * Converte o que o caixa digitou para o formato da API, sem somar nem usar float.
 * Aceita só dígitos com vírgula ou ponto e até 2 casas; qualquer outra coisa é inválida.
 *
 * @example toApiMoney('12,5') // '12.50'
 * @example toApiMoney('R$ 12,50') // null
 */
export function toApiMoney(typed: string): string | null {
  const text = typed.trim();
  if (!TYPED_MONEY.test(text)) return null;
  const [integerPart, cents = ''] = text.replace(',', '.').split('.');
  return `${Number(integerPart)}.${cents.padEnd(2, '0')}`;
}

/**
 * Mostra um valor da API no padrão brasileiro.
 *
 * @example formatMoney('1250.5') // 'R$ 1.250,50'
 */
export function formatMoney(apiValue: string): string {
  const [integerPart, cents = '00'] = apiValue.split('.');
  return `R$ ${integerPart.replace(THOUSANDS, '.')},${cents.padEnd(2, '0')}`;
}
