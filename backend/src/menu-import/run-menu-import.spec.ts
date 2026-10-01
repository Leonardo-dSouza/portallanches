import { FakeMenuImportTarget } from './fake-menu-import-target.fixture.js';
import { formatChanges, formatMenuSummary } from './menu-report.js';
import type { MenuPlan } from './menu-types.js';
import { runMenuImport } from './run-menu-import.js';

const PLAN: MenuPlan = {
  source: 'cardapio',
  supplies: [
    {
      name: 'Ovo',
      nameKey: 'ovo',
      countUnit: 'un',
      unitCost: '0.7333',
      deductOnSale: true,
      packages: [],
    },
  ],
  products: [],
  issues: [
    { severity: 'warning', where: 'Lanches!B41', message: 'nome diferente' },
  ],
};

const emptyDb = (): FakeMenuImportTarget =>
  new FakeMenuImportTarget({
    supplies: [],
    categoryKeys: ['tradicional'],
    products: [],
  });

describe('runMenuImport', () => {
  it('simulação não grava e devolve avisos e mudanças', async () => {
    const target = emptyDb();
    const result = await runMenuImport(PLAN, target, false);
    expect(result).toEqual({
      outcome: 'dry-run',
      issues: PLAN.issues,
      changes: ['+ insumo "Ovo" (un, custo 0.7333)'],
    });
    expect(target.written).toEqual([]);
  });

  it('com --apply grava o plano', async () => {
    const target = emptyDb();
    expect((await runMenuImport(PLAN, target, true)).outcome).toBe('applied');
    expect(target.written).toEqual([PLAN]);
  });

  it('erro da planilha ou do banco bloqueia mesmo com --apply', async () => {
    const target = new FakeMenuImportTarget({
      supplies: [
        { name: 'Ovo', nameKey: 'ovo', countUnit: 'bandeja', unitCost: null },
      ],
      categoryKeys: [],
      products: [],
    });
    const result = await runMenuImport(PLAN, target, true);
    expect(result.outcome).toBe('blocked');
    expect(target.written).toEqual([]);
  });
});

describe('relatório do cardápio', () => {
  it('resume insumos e lanches por categoria', () => {
    const product = { category: 'Artesanal' } as MenuPlan['products'][number];
    expect(formatMenuSummary({ ...PLAN, products: [product, product] })).toBe(
      'Insumos: 1\nLanches: Artesanal 2',
    );
  });

  it('lista as mudanças ou diz que não há nenhuma', () => {
    expect(formatChanges([])).toMatch(/nenhuma/);
    expect(formatChanges(['+ a'])).toBe('Mudanças (1):\n  + a');
  });
});
