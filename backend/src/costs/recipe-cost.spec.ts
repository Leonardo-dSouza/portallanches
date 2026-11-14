import {
  burgerRecipe,
  costsById,
  costsWithoutCreme,
  createCostLookup,
} from './cost-fakes.fixture.js';
import { recipeUnitCost } from './recipe-cost.js';
import type { SupplyRecipe } from './cost-types.js';

describe('recipeUnitCost', () => {
  it('calcula o custo unitário com todos os ingredientes precificados', () => {
    const lookup = createCostLookup(costsById);
    const result = recipeUnitCost(burgerRecipe, lookup);

    expect(result).toEqual({ unitCost: '6.1936', complete: true });
  });

  it('marca como incompleto e exclui ingrediente sem custo da soma', () => {
    const lookup = createCostLookup(costsWithoutCreme);
    const result = recipeUnitCost(burgerRecipe, lookup);

    expect(result).toEqual({ unitCost: '5.9114', complete: false });
  });

  it('lança erro quando rendimento for zero', () => {
    const lookup = createCostLookup(costsById);
    const zeroYieldRecipe: SupplyRecipe = {
      ...burgerRecipe,
      yieldQuantity: '0',
    };

    expect(() => recipeUnitCost(zeroYieldRecipe, lookup)).toThrow(
      'Rendimento 0 inválido: esperado maior que zero',
    );
  });

  it('lança erro quando rendimento for menor que zero', () => {
    const lookup = createCostLookup(costsById);
    const negativeYieldRecipe: SupplyRecipe = {
      ...burgerRecipe,
      yieldQuantity: '-1',
    };

    expect(() => recipeUnitCost(negativeYieldRecipe, lookup)).toThrow(
      'Rendimento -1 inválido: esperado maior que zero',
    );
  });

  it('calcula custo com rendimento fracionário e quantidades com 3 casas', () => {
    // 0.125 kg a 15.20 = 1.90
    // 0.375 kg a 8.40 = 3.15
    // Soma = 5.05; rendimento 2.5 un -> 5.05 / 2.5 = 2.02
    const fractionalRecipe: SupplyRecipe = {
      supplyId: 20,
      yieldQuantity: '2.5',
      items: [
        { supplyId: 201, quantity: '0.125' },
        { supplyId: 202, quantity: '0.375' },
      ],
    };
    const fractionalCosts = new Map<number, string>([
      [201, '15.20'],
      [202, '8.40'],
    ]);
    const lookup = createCostLookup(fractionalCosts);

    const result = recipeUnitCost(fractionalRecipe, lookup);
    expect(result).toEqual({ unitCost: '2.02', complete: true });
  });

  it('arredonda metade para cima na quarta casa decimal', () => {
    // 0.250 un a 10.0005 = 2.500125
    // 2.500125 / 2.5 = 1.00005 -> arredonda para 1.0001
    const roundingRecipe: SupplyRecipe = {
      supplyId: 30,
      yieldQuantity: '2.5',
      items: [{ supplyId: 301, quantity: '0.250' }],
    };
    const roundingCosts = new Map<number, string>([[301, '10.0005']]);
    const lookup = createCostLookup(roundingCosts);

    const result = recipeUnitCost(roundingRecipe, lookup);
    expect(result).toEqual({ unitCost: '1.0001', complete: true });
  });

  it('devolve custo zero e completo quando ficha não tem ingredientes', () => {
    const lookup = createCostLookup(costsById);
    const emptyRecipe: SupplyRecipe = {
      supplyId: 40,
      yieldQuantity: '10',
      items: [],
    };

    const result = recipeUnitCost(emptyRecipe, lookup);
    expect(result).toEqual({ unitCost: '0', complete: true });
  });

  it('devolve custo zero e incompleto quando todos ingredientes não têm custo', () => {
    const emptyCosts = new Map<number, string>();
    const lookup = createCostLookup(emptyCosts);

    const result = recipeUnitCost(burgerRecipe, lookup);
    expect(result).toEqual({ unitCost: '0', complete: false });
  });
});
