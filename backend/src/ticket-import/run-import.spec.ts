import type { ImportTarget } from './import-target.js';
import type { ImportPlan, PlannedDay } from './import-types.js';
import { runImport } from './run-import.js';
import { summarizeByMonth } from './import-summary.js';

class FakeImportTarget implements ImportTarget {
  written: PlannedDay[] = [];
  constructor(private readonly existing: string[] = []) {}
  findExistingDates(): Promise<string[]> {
    return Promise.resolve(this.existing);
  }
  writeDays(days: PlannedDay[]): Promise<void> {
    this.written = days;
    return Promise.resolve();
  }
}

const DAY: PlannedDay = {
  date: '2026-01-11',
  orderAmounts: ['36.40', '18.00'],
  motoboy: '70.00',
  otherExpenses: ['10.50'],
};
const PLAN: ImportPlan = { days: [DAY], issues: [] };

describe('runImport', () => {
  it('em dry-run valida e não grava', async () => {
    const target = new FakeImportTarget();
    const result = await runImport(PLAN, target, false);
    expect(result.outcome).toBe('dry-run');
    expect(target.written).toEqual([]);
  });

  it('com apply grava todos os dias', async () => {
    const target = new FakeImportTarget();
    expect((await runImport(PLAN, target, true)).outcome).toBe('applied');
    expect(target.written).toEqual([DAY]);
  });

  it('bloqueia se a planilha tem erro', async () => {
    const target = new FakeImportTarget();
    const plan: ImportPlan = {
      days: [DAY],
      issues: [{ severity: 'error', where: 'Janeiro!A', message: 'x' }],
    };
    expect((await runImport(plan, target, true)).outcome).toBe('blocked');
    expect(target.written).toEqual([]);
  });

  it('bloqueia se a data já existe no banco', async () => {
    const target = new FakeImportTarget(['2026-01-11']);
    const result = await runImport(PLAN, target, true);
    expect(result.outcome).toBe('blocked');
    expect(result.issues[0]?.message).toContain('2026-01-11');
    expect(target.written).toEqual([]);
  });

  it('avisos não bloqueiam', async () => {
    const plan: ImportPlan = {
      days: [DAY],
      issues: [{ severity: 'warning', where: 'Abril!T10', message: 'x' }],
    };
    expect((await runImport(plan, new FakeImportTarget(), true)).outcome).toBe(
      'applied',
    );
  });
});

describe('summarizeByMonth', () => {
  it('soma pedidos, motoboy e outros gastos por mês', () => {
    expect(summarizeByMonth([DAY, { ...DAY, date: '2026-01-12' }])).toEqual([
      {
        month: '2026-01',
        days: 2,
        orders: 4,
        ordersTotal: '108.80',
        motoboyTotal: '140.00',
        otherExpensesTotal: '21.00',
      },
    ]);
  });
});
