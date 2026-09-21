import { buildImportPlan } from './import-plan.js';
import type { CellValue, SheetGrid } from './import-types.js';

const day = (iso: string): Date => new Date(`${iso}T00:00:00Z`);

/** Monta uma aba a partir de colunas: cada coluna é [cabeçalho, ...valores]. */
function sheet(...columns: CellValue[][]): SheetGrid {
  const rows = Math.max(...columns.map((c) => c.length));
  return Array.from({ length: rows }, (_, r) =>
    columns.map((c) => c[r] ?? null),
  );
}

function grids(orders: SheetGrid, expenses: SheetGrid) {
  return new Map([
    ['Janeiro', orders],
    ['Gastos-Janeiro', expenses],
  ]);
}

describe('buildImportPlan', () => {
  it('casa pedidos e gastos do dia: 2ª linha de gastos é motoboy, o resto é outros', () => {
    const plan = buildImportPlan(
      grids(
        sheet([day('2026-01-11'), 36.4, 18]),
        sheet([day('2026-01-11'), 70, 217, 43.84]),
      ),
      2026,
      {},
    );
    expect(plan.issues).toEqual([]);
    expect(plan.days).toEqual([
      {
        date: '2026-01-11',
        orderAmounts: ['36.40', '18.00'],
        motoboy: '70.00',
        otherExpenses: ['217.00', '43.84'],
      },
    ]);
  });

  it('casa pela data e não pela posição da coluna', () => {
    const plan = buildImportPlan(
      grids(
        sheet([day('2026-01-11'), 10], [day('2026-01-12'), 20]),
        sheet([day('2026-01-12'), 5]),
      ),
      2026,
      {},
    );
    expect(plan.days.map((d) => [d.date, d.motoboy])).toEqual([
      ['2026-01-11', null],
      ['2026-01-12', '5.00'],
    ]);
  });

  it('avisa dia sem gastos e dia só com gastos, sem bloquear', () => {
    const plan = buildImportPlan(
      grids(sheet([day('2026-01-11'), 10]), sheet([day('2026-01-13'), 5])),
      2026,
      {},
    );
    expect(plan.issues.map((i) => i.severity)).toEqual(['warning', 'warning']);
    expect(plan.days.map((d) => d.date)).toEqual(['2026-01-11', '2026-01-13']);
  });

  it('acusa cabeçalho que não é data e data fora do mês, sem importar a coluna', () => {
    const plan = buildImportPlan(
      grids(
        sheet([' ', 10], [day('2026-02-03'), 20]),
        sheet([day('2026-01-11'), 5]),
      ),
      2026,
      {},
    );
    expect(plan.issues.filter((i) => i.severity === 'error')).toHaveLength(2);
    expect(plan.days.map((d) => d.date)).toEqual(['2026-01-11']);
  });

  it('aplica correção de cabeçalho e ignora coluna com skip', () => {
    const plan = buildImportPlan(
      grids(sheet([' ', 10], ['joao', 20]), sheet()),
      2026,
      { 'Janeiro!A': '2026-01-10', 'Janeiro!B': 'skip' },
    );
    expect(plan.issues.filter((i) => i.severity === 'error')).toEqual([]);
    expect(plan.days.map((d) => d.date)).toEqual(['2026-01-10']);
  });

  it('rejeita a mesma data em duas colunas da mesma aba', () => {
    const plan = buildImportPlan(
      grids(sheet([day('2026-01-11'), 1], [day('2026-01-11'), 2]), sheet()),
      2026,
      {},
    );
    expect(plan.issues[0]).toMatchObject({
      severity: 'error',
      where: 'Janeiro!B',
    });
  });
});
