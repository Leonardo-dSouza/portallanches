import { toNeighborhoodKey } from './neighborhood-key';

// Abreviações comuns no papel: "R. Laranjeiras" e "Av Brasil" viram a forma por extenso na chave.
const ABBREVIATIONS: readonly [RegExp, string][] = [
  [/^r\.?\s/, 'rua '],
  [/^av\.?\s/, 'avenida '],
  [/^tv\.?\s/, 'travessa '],
];

/**
 * Chave de comparação de rua: sem acento, minúsculas e abreviação expandida.
 *
 * @example toStreetKey(' R. São João ') // 'rua sao joao'
 */
export function toStreetKey(street: string): string {
  return ABBREVIATIONS.reduce(
    (key, [pattern, full]) => key.replace(pattern, full),
    toNeighborhoodKey(street),
  );
}

/**
 * Troca o que o caixa digitou pela grafia de uma rua já cadastrada, se for a mesma rua;
 * senão devolve o texto aparado. Evita "rua laranjeiras" e "Rua Laranjeiras" no ranking.
 *
 * @example snapStreet('r. laranjeiras', ['Rua Laranjeiras']) // 'Rua Laranjeiras'
 */
export function snapStreet(typed: string, known: readonly string[]): string {
  const key = toStreetKey(typed);
  return known.find((street) => toStreetKey(street) === key) ?? typed.trim();
}
