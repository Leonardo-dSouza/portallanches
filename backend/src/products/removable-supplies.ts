// Seções que não são ingrediente: a embalagem e os sachês acompanham o lanche, não vão nele.
const NON_REMOVABLE_SECTIONS = new Set([
  'Embalagens',
  'Papelaria e sacolas',
  'Armário',
]);

/** Ingrediente que o caixa pode tirar do lanche. */
export interface SaleRemovable {
  supplyId: number;
  name: string;
}

/** Insumo da composição como o catálogo lê. */
export interface RemovableCandidate {
  supplyId: number;
  supply: { name: string; section: { name: string } | null };
}

const isIngredient = ({ supply }: RemovableCandidate): boolean =>
  !NON_REMOVABLE_SECTIONS.has(supply.section?.name ?? '');

/**
 * O que dá para tirar de um lanche (item com número no cardápio; combo não, pedido do usuário,
 * 2026-10-30): os ingredientes da composição, por nome. Sem custo: isso vai para o caixa.
 *
 * @example removablesOf({ menuNumber: 9, isBundle: false }, components)[0].name // 'Alface'
 */
export function removablesOf(
  product: { menuNumber: number | null; isBundle: boolean },
  components: RemovableCandidate[],
): SaleRemovable[] {
  if (product.menuNumber === null || product.isBundle) return [];
  return components
    .filter(isIngredient)
    .map(({ supplyId, supply }) => ({ supplyId, name: supply.name }))
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
}
