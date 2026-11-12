import { describe, expect, it } from 'vitest';
import type { PrismaClient } from '../generated/prisma/client.js';
import { PrismaReportSource } from './prisma-report.source.js';
import { PrismaPeriodReportSource } from './prisma-period-report.source.js';

class FakePrismaForReports {
  lastWhereExpense: unknown;
  lastWhereClosingCount: unknown;
  lastWhereClosing: unknown;

  readonly expense = {
    findMany: async (args: { where: unknown }) => {
      this.lastWhereExpense = args.where;
      return [];
    },
  };

  readonly closingCount = {
    findMany: async (args: { where: unknown }) => {
      this.lastWhereClosingCount = args.where;
      return [{ paymentMethodId: 1, amount: { toFixed: () => '30.00' } }];
    },
  };

  readonly dailyClosing = {
    findUnique: async (args: { where: unknown }) => {
      this.lastWhereClosing = args.where;
      return { countedBy: { name: 'Maria' } };
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

  it('listClosingCounts lê do banco com closingId', async () => {
    const fake = new FakePrismaForReports();
    const source = new PrismaReportSource(fake as unknown as PrismaClient);
    const counts = await source.listClosingCounts(10);
    expect(counts).toEqual([{ paymentMethodId: 1, amount: '30.00' }]);
    expect(fake.lastWhereClosingCount).toEqual({ closingId: 10 });
  });

  it('findCountedBy devolve o nome de quem contou', async () => {
    const fake = new FakePrismaForReports();
    const source = new PrismaReportSource(fake as unknown as PrismaClient);
    const name = await source.findCountedBy(10);
    expect(name).toBe('Maria');
    expect(fake.lastWhereClosing).toEqual({ id: 10 });
  });
});
