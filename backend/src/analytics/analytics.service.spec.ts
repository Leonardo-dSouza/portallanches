import { BadRequestException } from '@nestjs/common';
import { parseDateRange } from '../closing/business-date.js';
import type { Clock } from '../common/clock.js';
import type { ClosingRangeLookup } from '../closing/closing-lookup.js';
import type { ClosingRecord } from '../closing/closing-repository.js';
import type {
  ClosingOrderRow,
  PeriodReportSource,
} from '../report/period-report-source.js';
import type { ReportPaymentMethodRow } from '../report/report-source.js';
import {
  analyticsOrder,
  deliveryOrder,
  soldItem,
} from './analytics.fixture.js';
import type {
  AnalyticsOrderRow,
  AnalyticsSource,
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
  async listOrders(closingIds: number[]): Promise<AnalyticsOrderRow[]> {
    const orders = [
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
}

/** Totais da semana anterior: um pedido de R$ 33,25 na terça 7. */
class FakePreviousWeekOrders implements Pick<PeriodReportSource, 'listOrders'> {
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
  async listPaymentMethods(): Promise<ReportPaymentMethodRow[]> {
    return [
      { id: 1, name: 'PIX', sortOrder: 0, isCardTerminal: false },
      { id: 3, name: 'Maquininha Tom', sortOrder: 2, isCardTerminal: true },
    ];
  }
}

/** "Agora" fixo: quinta, 08/10/2026, meio-dia em Brasília. */
const OCTOBER_8: Clock = () => new Date('2026-10-08T15:00:00Z');

function build() {
  const closings = new FakeWeekRangeLookup();
  const service = new AnalyticsService(
    new FakeAnalyticsSource(),
    new FakePreviousWeekOrders(),
    new FakePaymentMethods(),
    closings,
    OCTOBER_8,
    'America/Sao_Paulo',
  );
  return { service, closings };
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
