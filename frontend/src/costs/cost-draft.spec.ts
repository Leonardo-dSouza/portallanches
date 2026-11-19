import { describe, expect, it } from 'vitest';
import {
  countChanges,
  createEmptyCostChanges,
  removeRecipeChange,
  setBasePriceChange,
  setComponentsChange,
  setRecipeChange,
} from './cost-draft';

describe('cost-draft', () => {
  it('inicializa vazio com contagem zero', () => {
    const changes = createEmptyCostChanges();
    expect(countChanges(changes)).toBe(0);
  });

  it('mudar o mesmo insumo duas vezes substitui e mantém contagem 1', () => {
    const initial = createEmptyCostChanges();
    const first = setBasePriceChange(initial, {
      supplyId: 1,
      basePrice: '42.00',
      baseQuantity: '1',
      baseLabel: 'kg',
    });
    const second = setBasePriceChange(first, {
      supplyId: 1,
      basePrice: '45.00',
      baseQuantity: '1',
      baseLabel: 'kg',
    });

    expect(countChanges(second)).toBe(1);
    expect(second.basePrices).toHaveLength(1);
    expect(second.basePrices[0].basePrice).toBe('45.00');
  });

  it('setRecipe sobre insumo removido tira a remoção', () => {
    const initial = createEmptyCostChanges();
    const removed = removeRecipeChange(initial, 2);
    expect(removed.removedRecipeSupplyIds).toEqual([2]);
    expect(countChanges(removed)).toBe(1);

    const restored = setRecipeChange(removed, {
      supplyId: 2,
      yieldQuantity: '10',
      items: [{ supplyId: 1, quantity: '1.5' }],
    });

    expect(restored.removedRecipeSupplyIds).toHaveLength(0);
    expect(restored.recipes).toHaveLength(1);
    expect(countChanges(restored)).toBe(1);
  });

  it('removeRecipe sobre insumo com receita no rascunho tira a receita e marca remoção', () => {
    const initial = createEmptyCostChanges();
    const withRecipe = setRecipeChange(initial, {
      supplyId: 2,
      yieldQuantity: '10',
      items: [{ supplyId: 1, quantity: '1.5' }],
    });
    expect(withRecipe.recipes).toHaveLength(1);

    const removed = removeRecipeChange(withRecipe, 2);

    expect(removed.recipes).toHaveLength(0);
    expect(removed.removedRecipeSupplyIds).toEqual([2]);
    expect(countChanges(removed)).toBe(1);
  });

  it('removeRecipe duas vezes no mesmo insumo conta 1', () => {
    const initial = createEmptyCostChanges();
    const once = removeRecipeChange(initial, 2);
    const twice = removeRecipeChange(once, 2);

    expect(twice.removedRecipeSupplyIds).toEqual([2]);
    expect(countChanges(twice)).toBe(1);
  });

  it('setComponents substitui componentes do mesmo produto', () => {
    const initial = createEmptyCostChanges();
    const first = setComponentsChange(initial, {
      productId: 10,
      components: [{ supplyId: 1, quantity: '1' }],
    });
    const second = setComponentsChange(first, {
      productId: 10,
      components: [{ supplyId: 2, quantity: '1' }],
    });

    expect(countChanges(second)).toBe(1);
    expect(second.components[0].components[0].supplyId).toBe(2);
  });

  it('soma mudanças de tipos diferentes', () => {
    let changes = createEmptyCostChanges();
    changes = setBasePriceChange(changes, {
      supplyId: 1,
      basePrice: '45.00',
      baseQuantity: '1',
      baseLabel: 'kg',
    });
    changes = setRecipeChange(changes, {
      supplyId: 2,
      yieldQuantity: '10',
      items: [],
    });
    changes = setComponentsChange(changes, {
      productId: 10,
      components: [{ supplyId: 1, quantity: '0.05' }],
    });

    expect(countChanges(changes)).toBe(3);
  });
});
