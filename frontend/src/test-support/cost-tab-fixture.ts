import { vi } from 'vitest';
import type {
  CostProduct,
  CostSheetView,
  PricingCategory,
  ProductCostView,
} from '../api/cost-types';
import type { CostDraft } from '../costs/use-cost-draft';

/*
 * Aba Tradicional da planilha do cliente (2026-11-18) para os testes da tela de Custos: o X Burguer
 * com meta própria de 10%, o X Salada perto da meta, o Add Cheddar no prejuízo e os casos sem preço
 * e sem custo. Os números são os da planilha e os que a API devolve para eles.
 */

export const TRADICIONAL: PricingCategory = {
  id: 1,
  name: 'Tradicional',
  sortOrder: 1,
  fixedCostPercent: '41.07',
  profitPercent: '16',
};

export const BEBIDAS: PricingCategory = {
  id: 2,
  name: 'Refrigerantes',
  sortOrder: 2,
  fixedCostPercent: null,
  profitPercent: null,
};

const costProduct = (
  id: number,
  name: string,
  overrides: Partial<CostProduct> = {},
): CostProduct => ({
  id,
  name,
  categoryId: 1,
  menuNumber: id,
  salePrice: null,
  profitPercent: null,
  components: [],
  bundleItems: [],
  ...overrides,
});

const productView = (
  id: number,
  name: string,
  overrides: Partial<ProductCostView>,
): ProductCostView => ({
  id,
  name,
  categoryId: 1,
  menuNumber: id,
  salePrice: null,
  cmv: '0.00',
  cmvComplete: true,
  cmvPercent: null,
  pv: null,
  ifoodPv: null,
  profit: null,
  marginPercent: null,
  profitTarget: '16',
  ownProfitTarget: false,
  targetStatus: null,
  belowTarget: false,
  ...overrides,
});

/** Lanches da aba Tradicional e uma bebida, como o GET /costs devolve. */
export function costTabSheet(): CostSheetView {
  return {
    snapshot: {
      supplies: [
        supply(1, 'Queijo peça', 'kg', '39.9000'),
        supply(2, 'Pão de hambúrguer', 'un', '1.4000'),
        supply(3, 'Hambúrguer 56g', 'un', '1.2444'),
        supply(4, 'Salsicha', 'un', '0.7700'),
      ],
      recipes: [],
      products: [
        costProduct(1, 'Hot Dog', { salePrice: '17.90' }),
        costProduct(8, 'X Burguer', {
          salePrice: '17.00',
          profitPercent: '10',
          components: [
            { supplyId: 2, quantity: '1' },
            { supplyId: 1, quantity: '0.072' },
            { supplyId: 3, quantity: '1' },
          ],
        }),
        costProduct(9, 'X Salada', { salePrice: '17.60' }),
        costProduct(30, 'Add Cheddar Fatia', {
          menuNumber: null,
          salePrice: '3.50',
        }),
        costProduct(40, 'Lanche novo'),
        costProduct(41, 'Misto sem custo', { salePrice: '10.00' }),
        costProduct(50, 'Combo X Salada', {
          menuNumber: null,
          salePrice: '19.00',
          bundleItems: [{ productId: 9, quantity: 1 }],
        }),
        costProduct(60, 'Coca lata', { categoryId: 2, salePrice: '6.00' }),
      ],
      categories: [TRADICIONAL, BEBIDAS],
      ifood: { profitPercent: '10', commissionPercent: '28' },
      lastChangeSetId: 1,
    },
    products: [
      productView(1, 'Hot Dog', {
        salePrice: '17.90',
        cmv: '7.66',
        pv: '17.90',
        ifoodPv: '22.20',
        profit: '2.88',
        marginPercent: '16.1',
        targetStatus: 'ok',
      }),
      productView(8, 'X Burguer', {
        salePrice: '17.00',
        cmv: '8.48',
        pv: '17.30',
        ifoodPv: '24.10',
        profit: '1.53',
        marginPercent: '9.0',
        profitTarget: '10',
        ownProfitTarget: true,
        targetStatus: 'near',
      }),
      productView(9, 'X Salada', {
        salePrice: '17.60',
        cmv: '7.68',
        pv: '17.90',
        ifoodPv: '21.80',
        profit: '2.69',
        marginPercent: '15.3',
        targetStatus: 'near',
      }),
      productView(30, 'Add Cheddar Fatia', {
        menuNumber: null,
        salePrice: '3.50',
        cmv: '3.47',
        pv: '8.10',
        ifoodPv: '9.90',
        profit: '-1.40',
        marginPercent: '-40.0',
        targetStatus: 'below',
        belowTarget: true,
      }),
      productView(40, 'Lanche novo', { cmv: '5.00', pv: '11.70' }),
      productView(41, 'Misto sem custo', {
        salePrice: '10.00',
        cmvComplete: false,
        pv: '0.00',
        profit: '5.89',
        marginPercent: '58.9',
        targetStatus: 'ok',
      }),
      productView(50, 'Combo X Salada', {
        menuNumber: null,
        salePrice: '19.00',
        cmv: '7.68',
        pv: '17.90',
        profit: '3.51',
        marginPercent: '18.4',
        targetStatus: 'ok',
      }),
      productView(60, 'Coca lata', {
        categoryId: 2,
        salePrice: '6.00',
        cmv: '3.10',
        profit: '2.90',
        marginPercent: '48.3',
        profitTarget: null,
      }),
    ],
    incompleteSupplyIds: [],
  };
}

function supply(id: number, name: string, countUnit: string, unitCost: string) {
  return {
    id,
    name,
    sectionId: 1,
    countUnit,
    unitCost,
    basePrice: null,
    baseQuantity: null,
    baseLabel: null,
    packages: [],
  };
}

/** Rascunho falso: guarda as chamadas e responde ao teste de preço com a linha pedida. */
export function fakeCostDraft(
  sheet: CostSheetView,
  simulated: Partial<ProductCostView> = {},
): CostDraft {
  return {
    sheet,
    changes: {
      basePrices: [],
      recipes: [],
      removedRecipeSupplyIds: [],
      components: [],
      salePrices: [],
    },
    preview: null,
    changeCount: 0,
    setBasePrice: vi.fn(),
    setRecipe: vi.fn(),
    removeRecipe: vi.fn(),
    setComponents: vi.fn(),
    simulateSalePrice: vi.fn(async (productId: number, salePrice: string) => {
      const row = sheet.products.find((p) => p.id === productId);
      return row ? { ...row, salePrice, ...simulated } : null;
    }),
    discard: vi.fn(),
    save: vi.fn(async () => undefined),
    saving: false,
    conflict: false,
    error: null,
    reload: vi.fn(async () => undefined),
  };
}
