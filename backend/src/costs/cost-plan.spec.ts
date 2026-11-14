import { UnprocessableEntityException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { costSnapshotFixture } from './cost-fakes.fixture.js';
import { applyCostChanges } from './cost-plan.js';
import type { CostChanges } from './cost-types.js';

const emptyChanges: CostChanges = {
  basePrices: [],
  recipes: [],
  removedRecipeSupplyIds: [],
  components: [],
  salePrices: [],
};

describe('applyCostChanges', () => {
  it('não muta o snapshot recebido', () => {
    const original = costSnapshotFixture();
    const copy = JSON.parse(JSON.stringify(original));
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

    const next = applyCostChanges(original, changes);

    expect(original).toEqual(copy);
    expect(next).not.toBe(original);
    expect(next.supplies).not.toBe(original.supplies);
  });

  it('recalcula hambúrguer de 6.1936 para 6.7721 quando acém sobe para 45.00', () => {
    // Conta: (2 * 45.00 + 0.5 * 45.86 + 1.5 * 45.86 + 1 * 7.90) / 28
    // = (90.00 + 22.93 + 68.79 + 7.90) / 28 = 189.62 / 28 = 6.77214... -> '6.7721'
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

    const next = applyCostChanges(snapshot, changes);
    const acem = next.supplies.find((s) => s.id === 1);
    const burger = next.supplies.find((s) => s.id === 10);

    expect(acem?.unitCost).toBe('45');
    expect(burger?.unitCost).toBe('6.7721');
  });

  it('define unitCost como null quando basePrice é null', () => {
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

    const next = applyCostChanges(snapshot, changes);
    const pao = next.supplies.find((s) => s.id === 5);
    expect(pao?.unitCost).toBeNull();
    expect(pao?.basePrice).toBeNull();
  });

  it('mantém o custo do hambúrguer ao remover ficha e não o recalcula com mudança no acém', () => {
    const snapshot = costSnapshotFixture();
    const changes: CostChanges = {
      ...emptyChanges,
      removedRecipeSupplyIds: [10],
      basePrices: [
        {
          supplyId: 1,
          basePrice: '45.00',
          baseQuantity: '1',
          baseLabel: null,
        },
      ],
    };

    const next = applyCostChanges(snapshot, changes);
    const burger = next.supplies.find((s) => s.id === 10);
    expect(burger?.unitCost).toBe('6.1936');
    expect(next.recipes.find((r) => r.supplyId === 10)).toBeUndefined();
  });

  it('ao virar produzido, o insumo perde preço base', () => {
    const snapshot = costSnapshotFixture();
    const changes: CostChanges = {
      ...emptyChanges,
      recipes: [
        {
          supplyId: 5,
          yieldQuantity: '10',
          items: [{ supplyId: 1, quantity: '1' }],
        },
      ],
    };

    const next = applyCostChanges(snapshot, changes);
    const pao = next.supplies.find((s) => s.id === 5);
    expect(pao?.basePrice).toBeNull();
    expect(pao?.baseQuantity).toBeNull();
    expect(pao?.baseLabel).toBeNull();
  });

  it('rejeita preço base em insumo que termina com ficha com o id na mensagem', () => {
    const snapshot = costSnapshotFixture();
    const changes: CostChanges = {
      ...emptyChanges,
      basePrices: [
        {
          supplyId: 10,
          basePrice: '10.00',
          baseQuantity: '1',
          baseLabel: null,
        },
      ],
    };

    expect(() => applyCostChanges(snapshot, changes)).toThrow(
      UnprocessableEntityException,
    );
    expect(() => applyCostChanges(snapshot, changes)).toThrow(/10/);
  });

  it('rejeita ficha nova com insumo produzido como ingrediente (ficha só de um nível)', () => {
    const snapshot = costSnapshotFixture();
    const changes: CostChanges = {
      ...emptyChanges,
      recipes: [
        {
          supplyId: 6,
          yieldQuantity: '1',
          items: [{ supplyId: 10, quantity: '1' }],
        },
      ],
    };

    expect(() => applyCostChanges(snapshot, changes)).toThrow(
      UnprocessableEntityException,
    );
    expect(() => applyCostChanges(snapshot, changes)).toThrow(/10/);
  });

  it('rejeita ficha cujo ingrediente é o próprio insumo', () => {
    const snapshot = costSnapshotFixture();
    const changes: CostChanges = {
      ...emptyChanges,
      recipes: [
        {
          supplyId: 6,
          yieldQuantity: '1',
          items: [{ supplyId: 6, quantity: '1' }],
        },
      ],
    };

    expect(() => applyCostChanges(snapshot, changes)).toThrow(
      UnprocessableEntityException,
    );
    expect(() => applyCostChanges(snapshot, changes)).toThrow(/6/);
  });

  it('rejeita composição ou preço de venda em combo', () => {
    const snapshot = costSnapshotFixture();
    const comboId = 3;

    expect(() =>
      applyCostChanges(snapshot, {
        ...emptyChanges,
        components: [
          {
            productId: comboId,
            components: [{ supplyId: 1, quantity: '1' }],
          },
        ],
      }),
    ).toThrow(UnprocessableEntityException);

    expect(() =>
      applyCostChanges(snapshot, {
        ...emptyChanges,
        salePrices: [{ productId: comboId, salePrice: '50.00' }],
      }),
    ).toThrow(UnprocessableEntityException);
  });

  it('rejeita ids inexistentes de insumos ou produtos', () => {
    const snapshot = costSnapshotFixture();

    expect(() =>
      applyCostChanges(snapshot, {
        ...emptyChanges,
        basePrices: [
          {
            supplyId: 999,
            basePrice: '10.00',
            baseQuantity: '1',
            baseLabel: null,
          },
        ],
      }),
    ).toThrow(UnprocessableEntityException);

    expect(() =>
      applyCostChanges(snapshot, {
        ...emptyChanges,
        salePrices: [{ productId: 999, salePrice: '10.00' }],
      }),
    ).toThrow(UnprocessableEntityException);
  });

  it('define unitCost como null se nenhum ingrediente do produzido tiver custo', () => {
    const snapshot = costSnapshotFixture();
    const changes: CostChanges = {
      ...emptyChanges,
      recipes: [
        {
          supplyId: 5,
          yieldQuantity: '10',
          items: [{ supplyId: 6, quantity: '1' }], // Alface não tem custo (null)
        },
      ],
    };

    const next = applyCostChanges(snapshot, changes);
    const pao = next.supplies.find((s) => s.id === 5);
    expect(pao?.unitCost).toBeNull();
  });
});
