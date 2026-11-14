import { describe, expect, it } from 'vitest';
import { costSnapshotFixture } from './cost-fakes.fixture.js';
import { summarizeCostChanges } from './cost-summary.js';
import type { CostChanges } from './cost-types.js';

describe('summarizeCostChanges', () => {
  const emptyChanges: CostChanges = {
    basePrices: [],
    recipes: [],
    removedRecipeSupplyIds: [],
    components: [],
    salePrices: [],
  };

  it('retorna texto vazio quando não há mudanças', () => {
    const snapshot = costSnapshotFixture();
    expect(summarizeCostChanges(snapshot, emptyChanges)).toBe('');
  });

  it('formata alteração de preço base com vírgula decimal (Acém 36,90 → 45,00)', () => {
    const snapshot = costSnapshotFixture();
    const changes: CostChanges = {
      ...emptyChanges,
      basePrices: [
        {
          supplyId: 1,
          basePrice: '45.00',
          baseQuantity: '1',
          baseLabel: null,
        },
      ],
    };
    expect(summarizeCostChanges(snapshot, changes)).toBe('Acém 36,90 → 45,00');
  });

  it('formata remoção de preço base (Pão sem preço base)', () => {
    const snapshot = costSnapshotFixture();
    const changes: CostChanges = {
      ...emptyChanges,
      basePrices: [
        {
          supplyId: 5,
          basePrice: null,
          baseQuantity: '20',
          baseLabel: null,
        },
      ],
    };
    expect(summarizeCostChanges(snapshot, changes)).toBe('Pão sem preço base');
  });

  it('formata nova ficha ou alteração de ficha (Ficha Hambúrguer...)', () => {
    const snapshot = costSnapshotFixture();
    const changes: CostChanges = {
      ...emptyChanges,
      recipes: [
        {
          supplyId: 10,
          yieldQuantity: '28',
          items: [{ supplyId: 1, quantity: '2' }],
        },
      ],
    };
    expect(summarizeCostChanges(snapshot, changes)).toBe(
      'Ficha Hambúrguer artesanal de carne',
    );
  });

  it('formata remoção de ficha técnica', () => {
    const snapshot = costSnapshotFixture();
    const changes: CostChanges = {
      ...emptyChanges,
      removedRecipeSupplyIds: [10],
    };
    expect(summarizeCostChanges(snapshot, changes)).toBe(
      'Ficha removida Hambúrguer artesanal de carne',
    );
  });

  it('formata alteração na composição de produto (Receita X Salada...)', () => {
    const snapshot = costSnapshotFixture();
    const changes: CostChanges = {
      ...emptyChanges,
      components: [
        {
          productId: 1,
          components: [{ supplyId: 10, quantity: '1' }],
        },
      ],
    };
    expect(summarizeCostChanges(snapshot, changes)).toBe(
      'Receita X Salada artesanal',
    );
  });

  it('formata alteração de preço de venda (Preço X Salada 28,00 → 20,00)', () => {
    const snapshot = costSnapshotFixture();
    const changes: CostChanges = {
      ...emptyChanges,
      salePrices: [
        {
          productId: 1,
          salePrice: '20.00',
        },
      ],
    };
    expect(summarizeCostChanges(snapshot, changes)).toBe(
      'Preço X Salada artesanal 28,00 → 20,00',
    );
  });

  it('combina múltiplas alterações separadas por ponto e vírgula', () => {
    const snapshot = costSnapshotFixture();
    const changes: CostChanges = {
      ...emptyChanges,
      basePrices: [
        {
          supplyId: 1,
          basePrice: '45.00',
          baseQuantity: '1',
          baseLabel: null,
        },
        {
          supplyId: 5,
          basePrice: null,
          baseQuantity: '20',
          baseLabel: null,
        },
      ],
      salePrices: [
        {
          productId: 1,
          salePrice: '20.00',
        },
      ],
    };
    expect(summarizeCostChanges(snapshot, changes)).toBe(
      'Acém 36,90 → 45,00; Pão sem preço base; Preço X Salada artesanal 28,00 → 20,00',
    );
  });

  it('resume mais de 5 alterações com as 5 primeiras e " e mais N"', () => {
    const snapshot = costSnapshotFixture();
    const changes: CostChanges = {
      ...emptyChanges,
      basePrices: [
        { supplyId: 1, basePrice: '45.00', baseQuantity: '1', baseLabel: null },
        { supplyId: 2, basePrice: '50.00', baseQuantity: '1', baseLabel: null },
        { supplyId: 3, basePrice: '50.00', baseQuantity: '1', baseLabel: null },
        { supplyId: 4, basePrice: '10.00', baseQuantity: '1', baseLabel: null },
        { supplyId: 5, basePrice: null, baseQuantity: '20', baseLabel: null },
      ],
      salePrices: [
        { productId: 1, salePrice: '30.00' },
        { productId: 2, salePrice: '7.00' },
      ],
    };
    const summary = summarizeCostChanges(snapshot, changes);
    expect(summary).toBe(
      'Acém 36,90 → 45,00; Gordura de costela 45,86 → 50,00; Costela 45,86 → 50,00; Creme de cebola 7,90 → 10,00; Pão sem preço base e mais 2',
    );
  });
});
