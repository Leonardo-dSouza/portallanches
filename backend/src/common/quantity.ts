import { BadRequestException } from '@nestjs/common';

/**
 * Normaliza um decimal não negativo com até `maxDecimals` casas, sem passar por float:
 * tira zeros à esquerda e à direita. Devolve null se o texto não tiver esse formato
 * (negativo, vírgula, casas demais).
 *
 * @example normalizeDecimal('2.50', 3) // '2.5'
 */
export function normalizeDecimal(
  raw: unknown,
  maxDecimals: number,
): string | null {
  const text = typeof raw === 'number' ? String(raw) : raw;
  const pattern = new RegExp(`^\\d+(\\.\\d{1,${maxDecimals}})?$`);
  if (typeof text !== 'string' || !pattern.test(text)) return null;
  const [integerPart, decimals = ''] = text.split('.');
  const trimmed = decimals.replace(/0+$/, '');
  return `${Number(integerPart)}${trimmed ? `.${trimmed}` : ''}`;
}

/**
 * Valida uma quantidade de estoque (até 3 casas: 2.5 kg, 0.250 kg) e a devolve como texto
 * normalizado, sem passar por float. Rejeita negativo, vírgula e 4+ casas.
 *
 * @example parseQuantity('2.50', 'minStock', true) // '2.5'
 */
export function parseQuantity(
  raw: unknown,
  field: string,
  allowZero: boolean,
): string {
  const normalized = normalizeDecimal(raw, 3);
  if (normalized === null) throw invalidQuantity(field, raw);
  if (!allowZero && Number(normalized) === 0) throw invalidQuantity(field, raw);
  return normalized;
}

function invalidQuantity(field: string, raw: unknown): BadRequestException {
  return new BadRequestException(
    `Quantidade inválida em "${field}": recebido ${JSON.stringify(raw)}, esperado número não negativo com até 3 casas decimais (ex.: 2.5)`,
  );
}

/**
 * Quantidade normalizada em milésimos inteiros, para somar e comparar sem float.
 *
 * @example toMilli('2.5') // 2500
 */
export function toMilli(quantity: string): number {
  const [integerPart, decimals = ''] = quantity.split('.');
  return Number(integerPart) * 1000 + Number(decimals.padEnd(3, '0'));
}

/**
 * Milésimos de volta ao texto normalizado (sem zeros à direita).
 *
 * @example fromMilli(2500) // '2.5'
 */
export function fromMilli(milli: number): string {
  const integerPart = Math.floor(milli / 1000);
  const decimals = String(milli % 1000)
    .padStart(3, '0')
    .replace(/0+$/, '');
  return decimals ? `${integerPart}.${decimals}` : String(integerPart);
}

/**
 * Multiplica duas quantidades (ex.: 2 fardos × 6 un) sem float. Devolve null se o
 * resultado precisar de mais de 3 casas (ex.: 0.333 × 0.5).
 *
 * @example multiplyQuantities('2', '6') // '12'
 */
export function multiplyQuantities(a: string, b: string): string | null {
  const product = BigInt(toMilli(a)) * BigInt(toMilli(b));
  if (product % 1000n !== 0n) return null;
  return fromMilli(Number(product / 1000n));
}
