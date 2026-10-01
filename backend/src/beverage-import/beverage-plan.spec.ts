import { gridOf } from '../menu-import/menu-grid.fixture.js';
import type { FormulaGrid } from '../menu-import/menu-types.js';
import type { BeverageLayout } from './beverage-layout.js';
import { buildBeveragePlan } from './beverage-plan.js';

const LAYOUT: BeverageLayout = {
  sheet: 'Plan1',
  blocks: [
    { rows: '4-5', category: 'Refrigerantes', packageName: 'Fardo' },
    { rows: '29-29', category: 'Cervejas', packageName: 'Fardo' },
  ],
  splits: {},
};

const COCA = {
  B4: 'coca cola lt 350ml',
  C4: 12,
  D4: 40.68,
  E4: ['=D4/C4', 3.39],
  F4: 6,
} as const;

const build = (sheet: FormulaGrid, corrections = {}) =>
  buildBeveragePlan(new Map([['Plan1', sheet]]), LAYOUT, corrections);

describe('buildBeveragePlan', () => {
  it('cada linha vira um insumo (un, fardo de qtd) e um produto com 1 un dele', () => {
    const plan = build(gridOf(COCA));
    expect(plan).toEqual({
      source: 'bebidas',
      supplies: [
        {
          name: 'Coca Cola Lt 350ml',
          nameKey: 'coca cola lt 350ml',
          countUnit: 'un',
          unitCost: '3.39',
          deductOnSale: true,
          packages: [{ name: 'Fardo', quantity: '12' }],
        },
      ],
      products: [
        {
          where: 'Plan1!4',
          category: 'Refrigerantes',
          categoryKey: 'refrigerantes',
          name: 'Coca Cola Lt 350ml',
          nameKey: 'coca cola lt 350ml',
          menuNumber: null,
          description: null,
          salePrice: '6.00',
          components: [{ supplyKey: 'coca cola lt 350ml', quantity: '1' }],
          cmv: '3.39',
        },
      ],
      issues: [],
    });
  });

  it('vale o "custo un" digitado; avisa quando não bate com custo ÷ qtd', () => {
    const plan = build(gridOf({ ...COCA, E4: 4.49, D4: 44.28 }));
    expect(plan.supplies[0].unitCost).toBe('4.49');
    expect(plan.issues).toMatchObject([
      {
        severity: 'warning',
        where: 'Plan1!E4',
        message: expect.stringContaining('3.69'),
      },
    ]);
  });

  it('CMV arredonda meio centavo para cima, como nos lanches (regressão: Itaipava litrão)', () => {
    const plan = build(gridOf({ ...COCA, E4: 10.395 }));
    expect(plan.products[0].cmv).toBe('10.40');
  });

  it('sem custo ou sem preço entra assim mesmo, com aviso', () => {
    const plan = build(gridOf({ B5: 'fanta 2l', C5: 6, D5: 0, F5: 0 }));
    expect(plan.supplies[0].unitCost).toBeNull();
    expect(plan.products[0]).toMatchObject({ salePrice: null, cmv: null });
    expect(plan.issues.map((i) => [i.severity, i.where])).toEqual([
      ['warning', 'Plan1!E5'],
      ['warning', 'Plan1!F5'],
    ]);
  });

  it('pula linha sem nome, aplica correções e separa os blocos por categoria', () => {
    const sheet = gridOf({
      ...COCA,
      B29: 'pertra lata 350ml',
      C29: 12,
      E29: 3.2,
      F29: 6,
    });
    const plan = build(sheet, { 'Plan1!B29': 'petra lata 350ml' });
    expect(plan.products.map((p) => [p.name, p.category])).toEqual([
      ['Coca Cola Lt 350ml', 'Refrigerantes'],
      ['Petra Lata 350ml', 'Cervejas'],
    ]);
  });

  it('linha com divisão vira um produto por sabor, cada um com insumo próprio', () => {
    const layout = {
      ...LAYOUT,
      splits: { 'it sabores 2l': ['It Limão 2L', 'It Laranja 2L'] },
    };
    const sheet = gridOf({ B4: 'It sabores 2l', C4: 6, F4: 8 });
    const plan = buildBeveragePlan(new Map([['Plan1', sheet]]), layout, {});
    expect(plan.supplies.map((s) => [s.name, s.packages])).toEqual([
      ['It Limão 2L', [{ name: 'Fardo', quantity: '6' }]],
      ['It Laranja 2L', [{ name: 'Fardo', quantity: '6' }]],
    ]);
    expect(plan.products.map((p) => [p.name, p.salePrice])).toEqual([
      ['It Limão 2L', '8.00'],
      ['It Laranja 2L', '8.00'],
    ]);
    // "sem custo" aparece uma vez, da linha, não uma por sabor.
    expect(plan.issues).toHaveLength(1);
  });

  it('correção de nome não cria bebida em linha vazia', () => {
    const plan = build(gridOf(COCA), { 'Plan1!B5': 'fantasma' });
    expect(plan.products.map((p) => p.name)).toEqual(['Coca Cola Lt 350ml']);
  });

  it('nome repetido e aba ausente são erro', () => {
    const repeated = build(
      gridOf({ ...COCA, B5: 'Coca Cola LT 350ml', F5: 6 }),
    );
    const errors = repeated.issues.filter((i) => i.severity === 'error');
    expect(errors).toMatchObject([{ where: 'Plan1!5' }]);
    const missing = buildBeveragePlan(new Map(), LAYOUT, {});
    expect(missing.issues).toMatchObject([
      { severity: 'error', where: 'Plan1' },
    ]);
  });
});
