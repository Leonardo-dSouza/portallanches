import { describe, expect, it } from 'vitest';
import type { PrismaClient } from '../generated/prisma/client.js';
import { PrismaReportSource } from './prisma-report.source.js';
import { PrismaPeriodReportSource } from './prisma-period-report.source.js';

class FakePrismaForReports {
  lastWhereExpense: unknown;

  readonly expense = {
    findMany: async (args: { where: unknown }) => {
      this.lastWhereExpense = args.where;
      return [];
    },
  };
}

describe('Relatórios ignoram gastos cancelados (2026-11-08)', () => {
  it('relatório da noite filtra canceledAt: null em despesas', async () => {
    const fake = new FakePrismaForReports();
    const source = new PrismaReportSource(fake as unknown as PrismaClient);

    await source.listExpenseAmounts(10);
    expect(fake.lastWhereExpense).toMatchObject({
      closingId: 10,
      canceledAt: null,
    });
  });

  it('relatório do período filtra canceledAt: null em despesas', async () => {
    const fake = new FakePrismaForReports();
    const source = new PrismaPeriodReportSource(
      fake as unknown as PrismaClient,
    );

    await source.listExpenses([10, 11]);
    expect(fake.lastWhereExpense).toMatchObject({
      closingId: { in: [10, 11] },
      canceledAt: null,
    });
  });
});
