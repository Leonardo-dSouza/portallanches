import { BadRequestException } from '@nestjs/common';
import { parseDateRange } from '../closing/business-date.js';
import type { Clock } from '../common/clock.js';
import type { ClosingRangeLookup } from '../closing/closing-lookup.js';
import type { ClosingRecord } from '../closing/closing-repository.js';
import type {
  ClosingFiadoPaymentRow,
  ClosingOrderRow,
  PeriodReportSource,
} from '../report/period-report-source.js';
import {
  ANALYTICS_METHODS,
  analyticsOrder,
  deliveryOrder,
  soldItem,
} from './analytics.fixture.js';
import type {
  AnalyticsFiadoBalanceRow,
  AnalyticsOrderRow,
  AnalyticsSource,
  AnalyticsStaffConsumptionRow,
  CategoryOrderRow,
} from './analytics-source.js';
import { AnalyticsService } from './analytics.service.js';

const closing = (id: number, businessDate: string): ClosingRecord => ({
  id,
  businessDate,
  status: 'CLOSED',
  motoboyDailyRate: '40.00',
  closedById: 1,
  closedAt: null,
  reopenedById: null,
  reopenedAt: null,
  notes: null,
});

/** Semana de 21 a 27/09 com uma terça (1) e uma sexta (2); a semana anterior tem a terça 7. */
class FakeWeekRangeLookup implements ClosingRangeLookup {
  readonly asked: string[][] = [];

  async listBetween(from?: string, to?: string): Promise<ClosingRecord[]> {
    const range = parseDateRange(from, to);
    this.asked.push([range.from, range.to]);
    if (range.from === '2026-09-21')
      return [closing(1, '2026-09-22'), closing(2, '2026-09-25')];
    return [closing(7, '2026-09-15')];
  }
}

class FakeAnalyticsSource implements AnalyticsSource {
  constructor(
    private readonly fiadoOrders: AnalyticsOrderRow[] = [],
    private readonly fiadoBalances: AnalyticsFiadoBalanceRow[] = [],
  ) {}

  async listFiadoBalances(): Promise<AnalyticsFiadoBalanceRow[]> {
    return this.fiadoBalances;
  }

  async listOrders(closingIds: number[]): Promise<AnalyticsOrderRow[]> {
    const orders = [
      ...this.fiadoOrders,
      analyticsOrder('35.60', {
        items: [soldItem(9, 'X Salada', { quantity: 2, unitPrice: '17.80' })],
      }),
      deliveryOrder(
        '30.90',
        'Centro',
        { id: 7, name: 'Ana' },
        {
          closingId: 2,
          paymentMethodId: 3,
          paymentMode: 'DEBIT',
          items: [
            soldItem(10, 'X Bacon', {
              categoryName: 'Artesanal',
              unitPrice: '25.90',
            }),
          ],
        },
      ),
    ];
    return orders.filter((order) => closingIds.includes(order.closingId));
  }

  async listCategoryOrder(): Promise<CategoryOrderRow[]> {
    return [
      { name: 'Tradicional', sortOrder: 1 },
      { name: 'Artesanal', sortOrder: 2 },
    ];
  }

  readonly consumptionClosingIds: number[][] = [];

  /** Um consumo só: a Bianca com um X Salada de CMV 2,44. */
  async listStaffConsumptions(
    closingIds: number[],
  ): Promise<AnalyticsStaffConsumptionRow[]> {
    this.consumptionClosingIds.push(closingIds);
    const item = soldItem(9, 'X Salada', { unitPrice: '17.80' });
    const entry = { ...item, unitCmv: '2.44', cmvComplete: true };
    return [
      {
        consumerName: 'Bianca',
        consumerKey: 'bianca',
        items: [
          { ...entry, removals: [], note: null, choice: null, addons: [] },
        ],
      },
    ];
  }
}

/** Totais da semana anterior: um pedido de R$ 33,25 na terça 7. */
class FakePreviousWeekOrders implements Pick<
  PeriodReportSource,
  'listOrders' | 'listFiadoPayments'
> {
  constructor(private readonly payments: ClosingFiadoPaymentRow[] = []) {}

  async listFiadoPayments(
    closingIds: number[],
  ): Promise<ClosingFiadoPaymentRow[]> {
    return this.payments.filter((p) => closingIds.includes(p.closingId));
  }

  async listOrders(closingIds: number[]): Promise<ClosingOrderRow[]> {
    if (!closingIds.includes(7)) return [];
    return [
      {
        closingId: 7,
        amount: '33.25',
        type: 'COUNTER',
        paymentMethodId: 1,
        paymentMode: null,
        deliveryFee: '0.00',
      },
    ];
  }
}

class FakePaymentMethods {
  async listPaymentMethods() {
    return ANALYTICS_METHODS;
  }
}

/** "Agora" fixo: quinta, 08/10/2026, meio-dia em Brasília. */
const OCTOBER_8: Clock = () => new Date('2026-10-08T15:00:00Z');

function build(
  source = new FakeAnalyticsSource(),
  previousOrders = new FakePreviousWeekOrders(),
) {
  const closings = new FakeWeekRangeLookup();
  const service = new AnalyticsService(
    source,
    previousOrders,
    new FakePaymentMethods(),
    closings,
    OCTOBER_8,
    'America/Sao_Paulo',
  );
  return { service, closings, source };
}

describe('AnalyticsService', () => {
  it('compara com o período anterior do mesmo tamanho', async () => {
    const { service, closings } = build();
    const report = await service.forRange('2026-09-21', '2026-09-27');
    expect(closings.asked).toEqual([
      ['2026-09-21', '2026-09-27'],
      ['2026-09-14', '2026-09-20'],
    ]);
    expect(report.totals).toMatchObject({
      orders: 2,
      revenue: '66.50',
      averageTicket: '33.25',
      deliveries: 1,
    });
    expect(report.previous).toMatchObject({
      from: '2026-09-14',
      to: '2026-09-20',
      totals: { orders: 1, revenue: '33.25' },
    });
    expect(report.changes).toEqual({
      revenue: '100.0',
      orders: '100.0',
      averageTicket: '0.0',
      deliveries: null,
    });
  });

  it('traz o consumo interno dos fechamentos do período, pelo custo', async () => {
    const { service, source } = build();
    const report = await service.forRange('2026-09-21', '2026-09-27');
    expect(source.consumptionClosingIds).toEqual([[1, 2]]);
    expect(report.staffConsumption).toMatchObject({
      count: 1,
      cmvTotal: '2.44',
      byPerson: [{ name: 'Bianca', count: 1, cmvTotal: '2.44' }],
      topItems: [{ name: 'X Salada', quantity: 1 }],
    });
  });

  it('monta rankings, categorias, dias da semana e pagamentos do período', async () => {
    const report = await build().service.forRange('2026-09-21', '2026-09-27');
    expect(report.topProducts.map((p) => [p.name, p.quantity])).toEqual([
      ['X Salada', 2],
      ['X Bacon', 1],
    ]);
    expect(report.byCategory.map((c) => [c.categoryName, c.quantity])).toEqual([
      ['Tradicional', 2],
      ['Artesanal', 1],
    ]);
    expect(report.topNeighborhoods).toEqual([
      { neighborhood: 'Centro', deliveries: 1, revenue: '30.90' },
    ]);
    expect(report.topCustomers[0]).toMatchObject({ name: 'Ana', orders: 1 });
    expect(report.daily.map((d) => d.businessDate)).toEqual([
      '2026-09-22',
      '2026-09-25',
    ]);
    expect(report.byWeekday.map((w) => w.weekday)).toEqual([2, 5]);
    expect(report.byPaymentMethod[1].byMode).toEqual([
      { mode: 'DEBIT', ordersCount: 1, total: '30.90' },
    ]);
    expect(report.items).toEqual({ itemsSold: 3, ordersWithoutItems: 0 });
  });

  describe('fiado vendido na terça e recebido na sexta (2026-11-01)', () => {
    const sold = analyticsOrder('40.00', {
      paymentMethodId: 9,
      items: [soldItem(9, 'X Salada', { quantity: 3, unitPrice: '13.00' })],
    });
    const received = (closingId: number): ClosingFiadoPaymentRow => ({
      closingId,
      amount: '40.00',
      extra: '5.00',
      paymentMethodId: 1,
      paymentMode: null,
    });
    const period = () =>
      build(
        new FakeAnalyticsSource([sold]),
        new FakePreviousWeekOrders([received(2), received(7)]),
      ).service.forRange('2026-09-21', '2026-09-27');

    it('o faturamento segue o recebimento, e os pedidos e o ticket, a venda', async () => {
      const { totals } = await period();
      expect(totals).toMatchObject({
        orders: 3,
        revenue: '111.50',
        averageTicket: '33.25',
      });
    });

    it('cada noite leva o dinheiro que entrou nela', async () => {
      const { daily } = await period();
      expect(daily.map((d) => [d.orders, d.revenue])).toEqual([
        [2, '35.60'],
        [1, '75.90'],
      ]);
    });

    it('Pagamentos soma o recebido com o adicional e não mostra a forma fiado', async () => {
      const { byPaymentMethod } = await period();
      expect(byPaymentMethod.map((m) => [m.name, m.total])).toEqual([
        ['PIX', '80.60'],
        ['Maquininha Ton', '30.90'],
      ]);
    });

    it('os rankings seguem a noite da venda', async () => {
      const { topProducts } = await period();
      expect(topProducts[0]).toMatchObject({ name: 'X Salada', quantity: 5 });
    });

    it('o período anterior compara com a mesma regra', async () => {
      const { previous } = await period();
      expect(previous.totals.revenue).toBe('78.25');
    });
  });

  it('diz quanto dos fiados do período ainda falta receber (2026-11-01)', async () => {
    const source = new FakeAnalyticsSource(
      [],
      [{ amount: '40.00', paid: '10.00' }],
    );
    const { fiadoToReceive } = await build(source).service.forRange(
      '2026-09-21',
      '2026-09-27',
    );
    expect(fiadoToReceive).toEqual({ count: 1, total: '30.00' });
  });

  it('noite sem expediente não entra nas médias da Análise por dia da semana', async () => {
    class RangeWithEmptyNight implements ClosingRangeLookup {
      async listBetween(from?: string): Promise<ClosingRecord[]> {
        if (from === '2026-09-21') {
          return [
            closing(1, '2026-09-22'),
            closing(2, '2026-09-25'),
            // Outra terça sem nenhum pedido válido lançado
            closing(3, '2026-09-29'),
          ];
        }
        return [closing(7, '2026-09-15')];
      }
    }
    const service = new AnalyticsService(
      new FakeAnalyticsSource(),
      new FakePreviousWeekOrders(),
      new FakePaymentMethods(),
      new RangeWithEmptyNight(),
      OCTOBER_8,
      'America/Sao_Paulo',
    );
    const report = await service.forRange('2026-09-21', '2026-09-29');
    const tuesday = report.byWeekday.find((w) => w.weekday === 2);
    // A terça sem pedidos não divide a média (continua 1 noite aberta, 1 pedido, R$ 35,60)
    expect(tuesday).toMatchObject({
      weekday: 2,
      nights: 1,
      orders: 1,
      revenue: '35.60',
      averageOrders: '1.0',
      averageRevenue: '35.60',
    });
  });

  it('mês em andamento busca só até hoje e compara com o mesmo trecho do mês anterior', async () => {
    const { service, closings } = build();
    const report = await service.forRange('2026-10-01', '2026-10-31');
    expect(closings.asked).toEqual([
      ['2026-10-01', '2026-10-08'],
      ['2026-09-01', '2026-09-08'],
    ]);
    expect(report).toMatchObject({
      from: '2026-10-01',
      to: '2026-10-31',
      elapsedTo: '2026-10-08',
      previous: { from: '2026-09-01', to: '2026-09-08' },
    });
  });

  it('intervalo invertido é recusado', async () => {
    await expect(
      build().service.forRange('2026-09-30', '2026-09-01'),
    ).rejects.toThrow(BadRequestException);
  });
});
