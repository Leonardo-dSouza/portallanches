/**
 * Mesma normalização do backend (minúsculas, sem acento, espaços colapsados),
 * para reconhecer "  dunamis" como o bairro "Dunamis" já cadastrado.
 *
 * @example toNeighborhoodKey('  São José ') // 'sao jose'
 */
export function toNeighborhoodKey(name: string): string {
  return name
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
}
