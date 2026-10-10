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
 * Valor da API no padrão brasileiro, sem o "R$" (colunas de preço da comanda).
 *
 * @example formatAmount('1250.5') // '1.250,50'
 */
export function formatAmount(apiValue: string): string {
  const [integerPart, cents = '00'] = apiValue.split('.');
  return `${integerPart.replace(THOUSANDS, '.')},${cents.padEnd(2, '0')}`;
}

/**
 * Mostra um valor da API no padrão brasileiro.
 *
 * @example formatMoney('1250.5') // 'R$ 1.250,50'
 */
export function formatMoney(apiValue: string): string {
  return `R$ ${formatAmount(apiValue)}`;
}

/**
 * Valor da API (`'17.80'`) em centavos inteiros, sem float.
 *
 * @example moneyToCents('17.8') // 1780
 */
export function moneyToCents(apiValue: string): number {
  const [integerPart, cents = ''] = apiValue.split('.');
  return Number(integerPart) * 100 + Number(cents.padEnd(2, '0').slice(0, 2));
}

/**
 * Centavos inteiros no formato da API, para `formatMoney`.
 *
 * @example centsToMoney(6490) // '64.90'
 */
export function centsToMoney(cents: number): string {
  return `${Math.floor(cents / 100)}.${String(cents % 100).padStart(2, '0')}`;
}

/**
 * Preço × quantidade, em centavos (só para mostrar: o total gravado vem da API).
 *
 * @example multiplyMoney('14.20', 2) // '28.40'
 */
export function multiplyMoney(apiValue: string, quantity: number): string {
  return centsToMoney(moneyToCents(apiValue) * quantity);
}
