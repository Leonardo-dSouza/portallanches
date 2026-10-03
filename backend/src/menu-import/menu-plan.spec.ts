import { COSTS, gridOf, MAPPING } from './menu-grid.fixture.js';
import { buildMenuPlan, roundUpToTenCents } from './menu-plan.js';
import type { FormulaGrid, MenuMapping } from './menu-types.js';

// X Salada: 0,036 kg de queijo (R$ 1,44) + 1 hambúrguer (R$ 1,00) = CMV 2,44; PV = 2,44 ÷ 0,42.
const X_SALADA_ROW = {
  B2: 'X Salada',
  D2: ['=itens_custos!F6', 1.44],
  F2: ['=itens_custos!F8', 1],
  AJ2: 'X Salada',
  AK2: 2.44,
  AO2: 5.8095,
} as const;

function build(
  sheet: FormulaGrid,
  mapping: MenuMapping = MAPPING,
  corrections = {},
  extra: [string, FormulaGrid][] = [],
) {
  const grids = new Map([
    ['itens_custos', COSTS],
    ['Lanches', sheet],
    ...extra,
  ]);
  return buildMenuPlan(grids, mapping, corrections);
}

describe('roundUpToTenCents', () => {
  it.each([
    [17.7177, '17.80'],
    [3.42, '3.50'],
    [17.8, '17.80'],
    [17.800000000001, '17.80'],
    [0, '0.00'],
  ])('%d → %s', (value, expected) => {
    expect(roundUpToTenCents(value)).toBe(expected);
  });
});

describe('buildMenuPlan', () => {
  it('monta o lanche com composição, preço arredondado e CMV conferido', () => {
    const plan = build(gridOf({ ...X_SALADA_ROW }));
    expect(plan.issues).toEqual([]);
    expect(plan.supplies).toHaveLength(3);
    expect(plan.products).toEqual([
      {
        where: 'Lanches!2',
        category: 'Tradicional',
        categoryKey: 'tradicional',
        name: 'X Salada',
        nameKey: 'x salada',
        menuNumber: null,
        description: null,
        salePrice: '5.90',
        components: [
          { supplyKey: 'queijo bandeja', quantity: '0.036' },
          { supplyKey: 'hamburguer 56g', quantity: '1' },
        ],
        cmv: '2.44',
      },
    ]);
  });

  it('CMV diferente da planilha é erro; com correção na linha vira aviso', () => {
    const sheet = gridOf({ ...X_SALADA_ROW, AK2: 3.5 });
    expect(build(sheet).issues).toMatchObject([
      { severity: 'error', where: 'Lanches!2 (AK)' },
    ]);
    const corrected = build(sheet, MAPPING, { 'Lanches!H2': 'skip' });
    expect(corrected.issues).toMatchObject([
      {
        severity: 'warning',
        message: expect.stringMatching(/linha tem correções/),
      },
    ]);
  });

  it('usa o nome do cardápio (AJ), pega a descrição e o número por ele e avisa a diferença com a coluna B', () => {
    const menu = gridOf({
      A5: 9,
      B5: 'x salada especial',
      C5: 'Hambúrguer, queijo e salada',
    });
    const mapping: MenuMapping = {
      ...MAPPING,
      groups: [
        {
          ...MAPPING.groups[0],
          descriptions: {
            sheet: 'Cardápio_LT',
            nameColumn: 'B',
            valueColumn: 'C',
          },
          numbers: { sheet: 'Cardápio_LT', nameColumn: 'B', valueColumn: 'A' },
        },
      ],
    };
    const plan = build(
      gridOf({ ...X_SALADA_ROW, AJ2: 'X Salada Especial' }),
      mapping,
      {},
      [['Cardápio_LT', menu]],
    );
    expect(plan.products[0]).toMatchObject({
      name: 'X Salada Especial',
      menuNumber: 9,
      description: 'Hambúrguer, queijo e salada',
    });
    expect(plan.issues).toMatchObject([
      { severity: 'warning', where: 'Lanches!B2' },
    ]);
  });

  it('correção no nome do cardápio casa o número (regressão: "X Burguer Duplo Artesanal" = 27)', () => {
    const menu = gridOf({ A28: 27, B28: 'X Salada Artesanal' });
    const mapping: MenuMapping = {
      ...MAPPING,
      groups: [
        {
          ...MAPPING.groups[0],
          numbers: { sheet: 'Cardápio_LT', nameColumn: 'B', valueColumn: 'A' },
        },
      ],
    };
    const plan = build(
      gridOf(X_SALADA_ROW),
      mapping,
      { 'Cardápio_LT!B28': 'X Salada' },
      [['Cardápio_LT', menu]],
    );
    expect(plan.products[0]).toMatchObject({ menuNumber: 27 });
  });

  it('número fixo vale para lanche que falta no Cardápio_LT (X Queijo Egg Salada = 30)', () => {
    const mapping: MenuMapping = {
      ...MAPPING,
      groups: [
        {
          ...MAPPING.groups[0],
          numbers: { sheet: 'Cardápio_LT', nameColumn: 'B', valueColumn: 'A' },
          fixedNumbers: { 'X SALADA': 30 },
        },
      ],
    };
    const plan = build(gridOf(X_SALADA_ROW), mapping, {}, [
      ['Cardápio_LT', gridOf({ A5: 9, B5: 'X Bacon' })],
    ]);
    expect(plan.products[0]).toMatchObject({ menuNumber: 30 });
  });

  it('número da planilha vence o número fixo', () => {
    const mapping: MenuMapping = {
      ...MAPPING,
      groups: [
        {
          ...MAPPING.groups[0],
          numbers: { sheet: 'Cardápio_LT', nameColumn: 'B', valueColumn: 'A' },
          fixedNumbers: { 'X Salada': 30 },
        },
      ],
    };
    const plan = build(gridOf(X_SALADA_ROW), mapping, {}, [
      ['Cardápio_LT', gridOf({ A5: 9, B5: 'X Salada' })],
    ]);
    expect(plan.products[0]).toMatchObject({ menuNumber: 9 });
  });

  it('troca de insumo por lanche (regressão: Hots usam o pão de hot dog, mesmo custo)', () => {
    const mapping: MenuMapping = {
      ...MAPPING,
      supplies: [
        ...MAPPING.supplies,
        { ...MAPPING.supplies[1], name: 'Hambúrguer smash', packages: [] },
      ],
      supplySwaps: [
        {
          products: ['X SALADA'],
          from: 'Hambúrguer 56g',
          to: 'Hambúrguer smash',
        },
      ],
    };
    const plan = build(gridOf(X_SALADA_ROW), mapping);
    expect(plan.products[0]).toMatchObject({
      components: [
        { supplyKey: 'queijo bandeja', quantity: '0.036' },
        { supplyKey: 'hamburguer smash', quantity: '1' },
      ],
      cmv: '2.44',
    });
    expect(plan.issues).toEqual([]);
  });

  it('pula linha sem nome e acusa lanche repetido e preço que não é número', () => {
    const plan = build(
      gridOf({
        ...X_SALADA_ROW,
        B4: 'x salada',
        D4: ['=itens_custos!F6', 1.44],
        F4: ['=itens_custos!F8', 1],
        AK4: 2.44,
        AO4: '#DIV/0!',
      }),
    );
    expect(plan.products).toHaveLength(2);
    expect(plan.issues.map((i) => i.where)).toEqual([
      'Lanches!AO4',
      'Lanches!4',
    ]);
  });

  it('"skip" na coluna B tira o lanche mesmo com nome no AJ (regressão: X Brócolis Egg)', () => {
    const sheet = gridOf({ ...X_SALADA_ROW, F2: 3 });
    const plan = build(sheet, MAPPING, { 'Lanches!B2': 'skip' });
    expect(plan).toMatchObject({ products: [], issues: [] });
  });

  it('aba ausente e insumo de porção fora de supplies viram erro', () => {
    const mapping: MenuMapping = {
      ...MAPPING,
      groups: [{ ...MAPPING.groups[0], sheet: 'Sumiu' }],
      portions: {
        ...MAPPING.portions,
        F9: [{ supply: 'Picanha', quantity: '1' }],
      },
    };
    const plan = build(gridOf({}), mapping);
    expect(plan.issues.map((i) => i.where)).toEqual([
      'mapeamento portions.F9',
      'Sumiu',
    ]);
  });

  it('sem a aba itens_custos não há o que planejar', () => {
    const plan = buildMenuPlan(new Map(), MAPPING, {});
    expect(plan.issues).toMatchObject([
      { severity: 'error', where: 'itens_custos' },
    ]);
  });
});
