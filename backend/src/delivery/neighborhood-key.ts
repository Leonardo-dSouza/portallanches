/**
 * Chave de unicidade do bairro: minúsculas, sem acento e sem espaços nas pontas.
 * Evita cadastrar "Monterrey" e "monterrey " como bairros diferentes.
 *
 * @example toNeighborhoodKey('  São José ') // 'sao jose'
 */
export function toNeighborhoodKey(neighborhood: string): string {
  return neighborhood
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
}
