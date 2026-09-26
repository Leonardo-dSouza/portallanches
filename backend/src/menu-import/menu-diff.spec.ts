import { diffMenu } from './menu-diff.js';
import type { ExistingProduct, MenuSnapshot } from './menu-import-target.js';
import type { MenuPlan, PlannedProduct } from './menu-types.js';

const X_SALADA: PlannedProduct = {
  where: 'Lanches!10',
  category: 'Tradicional',
  categoryKey: 'tradicional',
  name: 'X Salada',
  nameKey: 'x salada',
  description: 'Hambúrguer e queijo',
  salePrice: '17.80',
  components: [
    { supplyKey: 'queijo bandeja', quantity: '0.036' },
    { supplyKey: 'hamburguer 56g', quantity: '1' },
  ],
  cmv: '7.44',
};

const PLAN: MenuPlan = {
  supplies: [
    {
      name: 'Queijo bandeja',
      nameKey: 'queijo bandeja',
      countUnit: 'kg',
      unitCost: '39.9',
      deductOnSale: true,
      packages: [],
    },
    {
      name: 'Hambúrguer 56g',
      nameKey: 'hamburguer 56g',
      countUnit: 'un',
      unitCost: '1.0417',
      deductOnSale: true,
      packages: [],
    },
  ],
  products: [X_SALADA],
  issues: [],
};

const EXISTING: ExistingProduct = {
  categoryKey: 'tradicional',
  nameKey: 'x salada',
  name: 'X Salada',
  salePrice: '18.00',
  description: 'Hambúrguer e queijo',
  components: [
    { supplyKey: 'queijo bandeja', quantity: '0.03' },
    { supplyKey: 'tomate', quantity: '0.02' },
  ],
};

const snapshot = (overrides: Partial<MenuSnapshot>): MenuSnapshot => ({
  supplies: [],
  categoryKeys: ['tradicional'],
  products: [],
  ...overrides,
});

describe('diffMenu', () => {
  it('banco vazio: tudo entra como novo', () => {
    expect(diffMenu(PLAN, snapshot({}))).toEqual({
      issues: [],
      changes: [
        '+ insumo "Queijo bandeja" (kg, custo 39.9)',
        '+ insumo "Hambúrguer 56g" (un, custo 1.0417)',
        '+ lanche "X Salada" · Tradicional: preço 17.80, CMV 7.44',
      ],
    });
  });

  it('a planilha vence: mostra custo, preço e composição antes → depois', () => {
    const diff = diffMenu(
      PLAN,
      snapshot({
        supplies: [
          {
            name: 'Queijo bandeja',
            nameKey: 'queijo bandeja',
            countUnit: 'kg',
            unitCost: '35',
          },
          {
            name: 'Hambúrguer 56g',
            nameKey: 'hamburguer 56g',
            countUnit: 'un',
            unitCost: '1.0417',
          },
          {
            name: 'Tomate',
            nameKey: 'tomate',
            countUnit: 'kg',
            unitCost: null,
          },
        ],
        products: [EXISTING],
      }),
    );
    expect(diff.changes).toEqual([
      '~ custo de "Queijo bandeja": 35 → 39.9',
      '~ "X Salada" · Tradicional: preço 18.00 → 17.80',
      '~ "X Salada" · Tradicional: composição +Queijo bandeja 0.036 kg, +Hambúrguer 56g 1 un, -Tomate 0.02 kg',
    ]);
  });

  it('sem diferença não há mudança', () => {
    const same = {
      ...EXISTING,
      salePrice: '17.80',
      components: X_SALADA.components,
    };
    const supplies = PLAN.supplies.map(
      ({ name, nameKey, countUnit, unitCost }) => ({
        name,
        nameKey,
        countUnit,
        unitCost,
      }),
    );
    expect(
      diffMenu(PLAN, snapshot({ supplies, products: [same] })).changes,
    ).toEqual([]);
  });

  it('unidade diferente e categoria ausente bloqueiam; lanche fora da planilha só avisa', () => {
    const diff = diffMenu(
      PLAN,
      snapshot({
        categoryKeys: [],
        supplies: [
          {
            name: 'Queijo bandeja',
            nameKey: 'queijo bandeja',
            countUnit: 'fatia',
            unitCost: null,
          },
        ],
      }),
    );
    expect(diff.issues.map((i) => i.severity)).toEqual(['error', 'error']);
    const orphan = { ...EXISTING, nameKey: 'x antigo', name: 'X Antigo' };
    expect(
      diffMenu(PLAN, snapshot({ products: [orphan] })).issues,
    ).toMatchObject([{ severity: 'warning', where: 'lanche "X Antigo"' }]);
  });
});
