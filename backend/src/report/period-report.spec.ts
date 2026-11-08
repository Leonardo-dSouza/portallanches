import { BadRequestException } from '@nestjs/common';
import type { ClosingRangeLookup } from '../closing/closing-lookup.js';
import type { ClosingRecord } from '../closing/closing-repository.js';
import type {
  ClosingExpenseRow,
  ClosingFiadoPaymentRow,
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
  paymentMode: null,
  deliveryFee: '0.00',
  ...overrides,
});

/** Como o Prisma: só devolve as linhas dos fechamentos pedidos. */
class FakePeriodReportSource implements PeriodReportSource {
  readonly askedIds: number[][] = [];

  constructor(
    private readonly fiadoOrders: ClosingOrderRow[] = [],
    private readonly fiadoPayments: ClosingFiadoPaymentRow[] = [],
  ) {}

  async listOrders(closingIds: number[]): Promise<ClosingOrderRow[]> {
    this.askedIds.push(closingIds);
    const orders = [
      ...this.fiadoOrders,
      order(1, '30.10'),
      order(1, '20.00', {
        type: 'DELIVERY',
        paymentMethodId: 2,
        deliveryFee: '5.00',
      }),
      order(2, '10.20'),
    ];
    return orders.filter((o) => closingIds.includes(o.closingId));
  }

  async listExpenses(closingIds: number[]): Promise<ClosingExpenseRow[]> {
    const expenses = [
      { closingId: 1, amount: '12.00' },
      { closingId: 2, amount: '0.10' },
    ];
    return expenses.filter((e) => closingIds.includes(e.closingId));
  }

  async listFiadoPayments(
    closingIds: number[],
  ): Promise<ClosingFiadoPaymentRow[]> {
    return this.fiadoPayments.filter((p) => closingIds.includes(p.closingId));
  }
}

class FakeMethods {
  async listPaymentMethods(): Promise<ReportPaymentMethodRow[]> {
    return [
      {
        id: 1,
        name: 'PIX',
        sortOrder: 0,
        isCardTerminal: false,
        isFiado: false,
      },
      {
        id: 2,
        name: 'Dinheiro',
        sortOrder: 1,
        isCardTerminal: false,
        isFiado: false,
      },
      {
        id: 9,
        name: 'Fiado',
        sortOrder: 2,
        isCardTerminal: false,
        isFiado: true,
      },
    ];
  }
}

class FakeRangeLookup implements ClosingRangeLookup {
  async listBetween(from?: string, to?: string): Promise<ClosingRecord[]> {
    if (!from || !to) throw new BadRequestException('sem intervalo');
    return [closing(1, '2026-09-22'), closing(2, '2026-09-23')];
  }
}

function build(
  fiadoOrders: ClosingOrderRow[] = [],
  fiadoPayments: ClosingFiadoPaymentRow[] = [],
): {
  service: PeriodReportService;
  source: FakePeriodReportSource;
} {
  const source = new FakePeriodReportSource(fiadoOrders, fiadoPayments);
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
      revenue: '60.30',
      byPaymentMethod: [
        {
          paymentMethodId: 1,
          name: 'PIX',
          ordersCount: 2,
          total: '40.30',
          byMode: [],
        },
        {
          paymentMethodId: 2,
          name: 'Dinheiro',
          ordersCount: 1,
          total: '20.00',
          byMode: [],
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

  describe('fiado vendido num dia e recebido no outro (2026-11-01)', () => {
    const sold = order(1, '40.00', { paymentMethodId: 9 });
    const received: ClosingFiadoPaymentRow = {
      closingId: 2,
      amount: '40.00',
      extra: '5.00',
      paymentMethodId: 2,
      paymentMode: null,
    };

    it('cada dia fatura o que entrou nele', async () => {
      const { days } = await build([sold], [received]).service.forRange(
        '2026-09-22',
        '2026-09-30',
      );
      expect(days.map((d) => [d.orders.count, d.revenue])).toEqual([
        [3, '50.10'],
        [1, '55.20'],
      ]);
    });

    it('o total do período soma o recebido com o adicional na forma', async () => {
      const { totals } = await build([sold], [received]).service.forRange(
        '2026-09-22',
        '2026-09-30',
      );
      expect(totals.orders).toEqual({ count: 4, total: '100.30' });
      expect(totals.revenue).toBe('105.30');
      expect(totals.byPaymentMethod.map((m) => [m.name, m.total])).toEqual([
        ['PIX', '40.30'],
        ['Dinheiro', '65.00'],
      ]);
    });

    it('recebimento de dia fora do filtro não entra', async () => {
      const report = await build([sold], [received]).service.forRange(
        '2026-09-22',
        '2026-09-30',
        '2',
      );
      expect(report.totals.revenue).toBe('50.10');
    });
  });

  it('com dia da semana, soma só esses dias (terça 22/09)', async () => {
    const report = await build().service.forRange(
      '2026-09-22',
      '2026-09-30',
      '2',
    );
    expect(report.days.map((d) => d.businessDate)).toEqual(['2026-09-22']);
    expect(report.totals.orders).toEqual({ count: 2, total: '50.10' });
    expect(report.totals.motoboy.dailyRates).toBe('40.00');
  });

  it('dia da semana inválido é recusado', async () => {
    await expect(
      build().service.forRange('2026-09-22', '2026-09-30', '9'),
    ).rejects.toThrow(BadRequestException);
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

  it('noite sem expediente não soma a diária do motoboy, mas mantém o gasto contando', async () => {
    class ThreeDaysLookup implements ClosingRangeLookup {
      async listBetween(): Promise<ClosingRecord[]> {
        return [
          closing(1, '2026-09-22'),
          closing(2, '2026-09-23'),
          {
            ...closing(3, '2026-11-02'),
            status: 'OPEN',
            motoboyDailyRate: '45.00',
          },
        ];
      }
    }
    class ThreeDaysSource extends FakePeriodReportSource {
      override async listOrders(ids: number[]): Promise<ClosingOrderRow[]> {
        const base = await super.listOrders(ids);
        // O fechamento 3 só teve pedido cancelado por engano (loja não abriu).
        const canceled = order(3, '40.00', {
          canceled: { dayNumber: 1, reason: 'Lançado por engano' },
        });
        return [...base, canceled].filter((o) => ids.includes(o.closingId));
      }

      override async listExpenses(ids: number[]): Promise<ClosingExpenseRow[]> {
        const base = await super.listExpenses(ids);
        // Compra lançada no dia em que a loja não abriu (ex.: estoque na folga).
        return [...base, { closingId: 3, amount: '50.00' }].filter((e) =>
          ids.includes(e.closingId),
        );
      }
    }

    const service = new PeriodReportService(
      new ThreeDaysSource(),
      new FakeMethods(),
      new ThreeDaysLookup(),
    );
    const report = await service.forRange('2026-09-22', '2026-11-02');

    // A noite 3 é sem expediente: diária zerada nela e fora do total do período.
    const day3 = report.days.find((d) => d.businessDate === '2026-11-02');
    expect(day3?.noBusiness).toBe(true);
    expect(day3?.motoboy.dailyRate).toBe('0.00');
    expect(day3?.expenses.total).toBe('50.00');

    // Total: diárias dos dias 1 e 2 (40 + 40 = 80), excluindo os 45 da noite 3.
    expect(report.totals.motoboy.dailyRates).toBe('80.00');
    // Total de gastos: inclui os 50 da noite sem expediente (12.00 + 0.10 + 50.00 = 62.10).
    expect(report.totals.expenses).toEqual({ count: 3, total: '62.10' });
  });

  it('calcula splitOrdersCount no período somando os pedidos divididos pagos na hora', async () => {
    class SplitSource extends FakePeriodReportSource {
      override async listOrders(ids: number[]): Promise<ClosingOrderRow[]> {
        return [
          order(1, '50.00', {
            paymentParts: [
              { paymentMethodId: 1, paymentMode: null, amount: '20.00' },
              { paymentMethodId: 2, paymentMode: null, amount: '30.00' },
            ],
          }),
          order(2, '30.00'),
        ].filter((o) => ids.includes(o.closingId));
      }
    }
    const service = new PeriodReportService(
      new SplitSource(),
      new FakeMethods(),
      new FakeRangeLookup(),
    );
    const report = await service.forRange('2026-09-22', '2026-09-23');
    expect(report.splitOrdersCount).toBe(1);
    expect(report.days[0].splitOrdersCount).toBe(1);
    expect(report.days[1].splitOrdersCount).toBe(0);
  });

  it('rejeita intervalo sem datas', async () => {
    await expect(
      build().service.forRange(undefined, '2026-09-30'),
    ).rejects.toThrow(BadRequestException);
  });
});
