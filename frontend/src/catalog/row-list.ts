/**
 * Troca um campo de uma linha de uma lista editável (embalagens, composição) sem mutar.
 *
 * @example replaceRowField([{ name: '' }], 0, 'name', 'caixa') // [{ name: 'caixa' }]
 */
export function replaceRowField<T extends object, K extends keyof T>(
  rows: T[],
  index: number,
  field: K,
  value: T[K],
): T[] {
  return rows.map((row, i) => (i === index ? { ...row, [field]: value } : row));
}

/**
 * Remove a linha `index` de uma lista editável.
 *
 * @example withoutRow(['a', 'b'], 0) // ['b']
 */
export function withoutRow<T>(rows: T[], index: number): T[] {
  return rows.filter((_, i) => i !== index);
}
