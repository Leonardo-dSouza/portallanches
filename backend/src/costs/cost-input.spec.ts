import { BadRequestException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { parseCostChanges } from './cost-input.js';

describe('parseCostChanges', () => {
  it('converte corpo vazio em listas vazias', () => {
    const changes = parseCostChanges({});
    expect(changes).toEqual({
      basePrices: [],
      recipes: [],
      removedRecipeSupplyIds: [],
      components: [],
      salePrices: [],
    });
  });

  it('rejeita corpo que não é objeto JSON', () => {
    expect(() => parseCostChanges(null)).toThrow(BadRequestException);
    expect(() => parseCostChanges('invalido')).toThrow(BadRequestException);
    expect(() => parseCostChanges([])).toThrow(BadRequestException);
  });

  it('rejeita basePrice igual a 0 ou negativo', () => {
    expect(() =>
      parseCostChanges({
        basePrices: [{ supplyId: 1, basePrice: '0', baseQuantity: '1' }],
      }),
    ).toThrow(BadRequestException);

    expect(() =>
      parseCostChanges({
        basePrices: [{ supplyId: 1, basePrice: '-10.00', baseQuantity: '1' }],
      }),
    ).toThrow(BadRequestException);
  });

  it('aceita basePrice nulo com quantidade válida', () => {
    const changes = parseCostChanges({
      basePrices: [
        { supplyId: 1, basePrice: null, baseQuantity: '1', baseLabel: null },
      ],
    });
    expect(changes.basePrices).toEqual([
      { supplyId: 1, basePrice: null, baseQuantity: '1', baseLabel: null },
    ]);
  });

  it('rejeita baseQuantity zero ou inválida', () => {
    expect(() =>
      parseCostChanges({
        basePrices: [{ supplyId: 1, basePrice: '10.00', baseQuantity: '0' }],
      }),
    ).toThrow(BadRequestException);
  });

  it('rejeita insumo repetido em basePrices com o id na mensagem', () => {
    expect(() =>
      parseCostChanges({
        basePrices: [
          { supplyId: 5, basePrice: '10.00', baseQuantity: '1' },
          { supplyId: 5, basePrice: '12.00', baseQuantity: '1' },
        ],
      }),
    ).toThrow(/5/);
  });

  it('rejeita ingrediente repetido na ficha com o id na mensagem', () => {
    expect(() =>
      parseCostChanges({
        recipes: [
          {
            supplyId: 10,
            yieldQuantity: '28',
            items: [
              { supplyId: 1, quantity: '2' },
              { supplyId: 1, quantity: '1' },
            ],
          },
        ],
      }),
    ).toThrow(/1/);
  });

  it('rejeita id repetido em removedRecipeSupplyIds', () => {
    expect(() =>
      parseCostChanges({
        removedRecipeSupplyIds: [10, 10],
      }),
    ).toThrow(/10/);
  });

  it('rejeita produto repetido em components ou salePrices', () => {
    expect(() =>
      parseCostChanges({
        components: [
          { productId: 1, components: [{ supplyId: 5, quantity: '1' }] },
          { productId: 1, components: [{ supplyId: 6, quantity: '1' }] },
        ],
      }),
    ).toThrow(/1/);

    expect(() =>
      parseCostChanges({
        salePrices: [
          { productId: 1, salePrice: '20.00' },
          { productId: 1, salePrice: '22.00' },
        ],
      }),
    ).toThrow(/1/);
  });

  it('faz o parse completo de um rascunho válido', () => {
    const raw = {
      basePrices: [
        {
          supplyId: 1,
          basePrice: '36.90',
          baseQuantity: '1',
          baseLabel: 'Peça a vácuo',
        },
      ],
      recipes: [
        {
          supplyId: 10,
          yieldQuantity: '28',
          items: [{ supplyId: 1, quantity: '2' }],
        },
      ],
      removedRecipeSupplyIds: [20],
      components: [
        {
          productId: 1,
          components: [{ supplyId: 10, quantity: '1' }],
        },
      ],
      salePrices: [{ productId: 1, salePrice: '29.90' }],
    };

    const changes = parseCostChanges(raw);
    expect(changes).toEqual(raw);
  });
});
