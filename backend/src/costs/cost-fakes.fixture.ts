import type { SupplyRecipe } from './cost-types.js';

/**
 * Ficha padrão de hambúrguer artesanal usada nos testes (rende 28 unidades).
 * Ingredientes:
 * - 1: acém (2 kg)
 * - 2: gordura de costela (0.5 kg)
 * - 3: costela (1.5 kg)
 * - 4: creme de cebola (1 un)
 */
export const burgerRecipe: SupplyRecipe = {
  supplyId: 10,
  yieldQuantity: '28',
  items: [
    { supplyId: 1, quantity: '2' },
    { supplyId: 2, quantity: '0.5' },
    { supplyId: 3, quantity: '1.5' },
    { supplyId: 4, quantity: '1' },
  ],
};

/** Preços unitários padrão dos insumos do hambúrguer. */
export const costsById = new Map<number, string>([
  [1, '36.90'],
  [2, '45.86'],
  [3, '45.86'],
  [4, '7.90'],
]);

/**
 * Preços dos insumos do hambúrguer sem o creme de cebola (id 4),
 * para simular ficha com insumo sem custo cadastrado.
 */
export const costsWithoutCreme = new Map<number, string>([
  [1, '36.90'],
  [2, '45.86'],
  [3, '45.86'],
]);

/**
 * Constrói função de consulta de custo a partir de um Map de insumos para testes.
 *
 * @example createCostLookup(costsById)(1) // '36.90'
 */
export function createCostLookup(
  costs: Map<number, string>,
): (supplyId: number) => string | null {
  return (supplyId: number): string | null => {
    return costs.get(supplyId) ?? null;
  };
}
