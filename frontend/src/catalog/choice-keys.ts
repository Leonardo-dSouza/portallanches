import type { CategoryProductOrder } from '../api/types';

/** Uma opção da escolha com a tecla do caixa; null = inativa (não aparece no caixa). */
export interface ChoiceKeyRow extends CategoryProductOrder {
  key: number | null;
}

/**
 * As opções na ordem gravada com a tecla de cada uma (1, 2, 3…), contando só as ativas, como
 * o caixa mostra (2026-11-08).
 *
 * @example choiceKeyRows(pães).map((r) => r.key) // [1, 2, null, 3]
 */
export function choiceKeyRows(options: CategoryProductOrder[]): ChoiceKeyRow[] {
  let next = 0;
  return options.map((option) => ({
    ...option,
    key: option.active ? ++next : null,
  }));
}

/**
 * Os ids de todas as opções com `id` trocado de lugar com o vizinho (-1 sobe, 1 desce); null
 * na ponta. A API pede a lista inteira, inativas também.
 *
 * @example moveOption(pães, 67, -1) // [67, 66, 65]
 */
export function moveOption(
  options: CategoryProductOrder[],
  id: number,
  direction: -1 | 1,
): number[] | null {
  const ids = options.map((option) => option.id);
  const from = ids.indexOf(id);
  const to = from + direction;
  if (from < 0 || to < 0 || to >= ids.length) return null;
  [ids[from], ids[to]] = [ids[to], ids[from]];
  return ids;
}
