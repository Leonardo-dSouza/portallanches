/** Cadastro com ordem própria (categorias do cardápio, formas de pagamento). */
interface Ordered {
  id: number;
  sortOrder: number;
}

/**
 * Na ordem do `sortOrder`, sem mexer na lista recebida.
 *
 * @example inSortOrder(methods)[0].name // 'Dinheiro'
 */
export function inSortOrder<T extends Ordered>(items: readonly T[]): T[] {
  return [...items].sort((a, b) => a.sortOrder - b.sortOrder);
}

/**
 * Ids de todos os itens (inativos também, o backend pede a lista inteira) com `id` trocado
 * de lugar com o vizinho: `-1` sobe, `1` desce. Null na ponta.
 *
 * @example moveInSortOrder(methods, 3, -1) // [1, 3, 2]
 */
export function moveInSortOrder(
  items: readonly Ordered[],
  id: number,
  direction: -1 | 1,
): number[] | null {
  const ids = inSortOrder(items).map((item) => item.id);
  const from = ids.indexOf(id);
  const to = from + direction;
  if (from < 0 || to < 0 || to >= ids.length) return null;
  [ids[from], ids[to]] = [ids[to], ids[from]];
  return ids;
}
