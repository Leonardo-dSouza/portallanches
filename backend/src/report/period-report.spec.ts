import { BadRequestException } from '@nestjs/common';
import type { ClosingRangeLookup } from '../closing/closing-lookup.js';
import type { ClosingRecord } from '../closing/closing-repository.js';
import type {
  ClosingExpenseRow,
  ClosingOrderRow,
  PeriodReportSource,
} from './period-report-source.js';
import { PeriodReportService } from './period-report.service.js';
import type { ReportPaymentMethodRow } from './report-source.js';

const closing = (id: number, businessDate: string): ClosingRecord => ({
  id,
  businessDate,
  status: 'CLOSED',
  motoboyDailyRate: '40.00',
  closedById: 2,
  closedAt: null,
  reopenedById: null,
  reopenedAt: null,
  notes: null,
});

const order = (
  closingId: number,
  amount: string,
  overrides: Partial<ClosingOrderRow> = {},
): ClosingOrderRow => ({
  closingId,
  amount,
  type: 'COUNTER',
  paymentMethodId: 1,
  deliveryFee: '0.00',
  ...overrides,
});

class FakePeriodReportSource implements PeriodReportSource {
  readonly askedIds: number[][] = [];

  async listOrders(closingIds: number[]): Promise<ClosingOrderRow[]> {
    this.askedIds.push(closingIds);
    return [
      order(1, '30.10'),
      order(1, '20.00', {
        type: 'DELIVERY',
        paymentMethodId: 2,
        deliveryFee: '5.00',
      }),
      order(2, '10.20'),
    ];
  }

  async listExpenses(): Promise<ClosingExpenseRow[]> {
    return [
      { closingId: 1, amount: '12.00' },
      { closingId: 2, amount: '0.10' },
    ];
  }
}

class FakeMethods {
  async listPaymentMethods(): Promise<ReportPaymentMethodRow[]> {
    return [
      { id: 1, name: 'PIX', sortOrder: 0 },
      { id: 2, name: 'Dinheiro', sortOrder: 1 },
    ];
  }
}

class FakeRangeLookup implements ClosingRangeLookup {
  async listBetween(from?: string, to?: string): Promise<ClosingRecord[]> {
    if (!from || !to) throw new BadRequestException('sem intervalo');
    return [closing(1, '2026-09-22'), closing(2, '2026-09-23')];
  }
}

function build(): {
  service: PeriodReportService;
  source: FakePeriodReportSource;
} {
  const source = new FakePeriodReportSource();
  const service = new PeriodReportService(
    source,
    new FakeMethods(),
    new FakeRangeLookup(),
  );
  return { service, source };
}

describe('PeriodReportService', () => {
  it('soma pedidos, formas de pagamento, entregas, motoboy e gastos do período', async () => {
    const report = await build().service.forRange('2026-09-22', '2026-09-30');
    expect(report.totals).toEqual({
      orders: { count: 3, total: '60.30' },
      byPaymentMethod: [
        { paymentMethodId: 1, name: 'PIX', ordersCount: 2, total: '40.30' },
        {
          paymentMethodId: 2,
          name: 'Dinheiro',
          ordersCount: 1,
          total: '20.00',
        },
      ],
      withoutPaymentMethod: { count: 0, total: '0.00' },
      delivery: { count: 1, feesTotal: '5.00' },
      motoboy: {
        dailyRates: '80.00',
        deliveryFees: '5.00',
        totalCost: '85.00',
      },
      expenses: { count: 2, total: '12.10' },
    });
  });

  it('separa os pedidos e gastos de cada dia em `days`', async () => {
    const { days } = await build().service.forRange('2026-09-22', '2026-09-30');
    expect(
      days.map((d) => [d.businessDate, d.orders.total, d.expenses.total]),
    ).toEqual([
      ['2026-09-22', '50.10', '12.00'],
      ['2026-09-23', '10.20', '0.10'],
    ]);
  });

  it('busca os dados de todos os dias em uma consulta só', async () => {
    const { service, source } = build();
    await service.forRange('2026-09-22', '2026-09-30');
    expect(source.askedIds).toEqual([[1, 2]]);
  });

  it('rejeita intervalo sem datas', async () => {
    await expect(
      build().service.forRange(undefined, '2026-09-30'),
    ).rejects.toThrow(BadRequestException);
  });
});
