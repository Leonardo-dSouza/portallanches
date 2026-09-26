const TYPED_QUANTITY = /^\d+([.,]\d{1,3})?$/;

/**
 * Quantidade digitada (vírgula ou ponto, até 3 casas) no formato da API, sem float.
 *
 * @example toApiQuantity('2,50') // '2.5'
 * @example toApiQuantity('2 kg') // null
 */
export function toApiQuantity(typed: string): string | null {
  const text = typed.trim();
  if (!TYPED_QUANTITY.test(text)) return null;
  const [integerPart, decimals = ''] = text.replace(',', '.').split('.');
  const trimmed = decimals.replace(/0+$/, '');
  return `${Number(integerPart)}${trimmed ? `.${trimmed}` : ''}`;
}

/**
 * Quantidade da API no padrão brasileiro (vírgula decimal), também usada para edição.
 *
 * @example formatQuantity('2.5') // '2,5'
 */
export function formatQuantity(apiQuantity: string): string {
  return apiQuantity.replace('.', ',');
}

const toMilli = (quantity: string): bigint => {
  const [integerPart, decimals = ''] = quantity.split('.');
  return BigInt(integerPart) * 1000n + BigInt(decimals.padEnd(3, '0'));
};

/**
 * Multiplica quantidades da API sem float (mesma regra do backend); null se passar de 3 casas.
 * Só para mostrar a prévia da conversão: quem converte de verdade é o servidor.
 *
 * @example multiplyQuantities('2', '6') // '12'
 */
export function multiplyQuantities(a: string, b: string): string | null {
  const product = toMilli(a) * toMilli(b);
  if (product % 1000n !== 0n) return null;
  const milli = product / 1000n;
  const decimals = String(milli % 1000n)
    .padStart(3, '0')
    .replace(/0+$/, '');
  const integerPart = String(milli / 1000n);
  return decimals ? `${integerPart}.${decimals}` : integerPart;
}
