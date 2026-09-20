import type { ClosingLookup } from '../closing/closing-lookup.js';
import type { ClosingRecord } from '../closing/closing-repository.js';
import type {
  ReportOrderRow,
  ReportPaymentMethodRow,
  ReportSource,
} from './report-source.js';
import { ReportService } from './report.service.js';

const CLOSING: ClosingRecord = {
  id: 7,
  businessDate: '2026-09-22',
  status: 'CLOSED',
  motoboyDailyRate: '40.00',
  closedById: 2,
  closedAt: null,
  reopenedById: null,
  reopenedAt: null,
  notes: null,
};

class FakeReportSource implements ReportSource {
  readonly askedClosingIds: number[] = [];

  async listOrders(closingId: number): Promise<ReportOrderRow[]> {
    this.askedClosingIds.push(closingId);
    return [
      {
        amount: '30.00',
        type: 'COUNTER',
        paymentMethodId: 1,
        deliveryFee: '0.00',
      },
    ];
  }

  async listExpenseAmounts(): Promise<string[]> {
    return ['10.00'];
  }

  async listPaymentMethods(): Promise<ReportPaymentMethodRow[]> {
    return [{ id: 1, name: 'PIX', sortOrder: 0 }];
  }
}

class FakeClosingLookup implements ClosingLookup {
  async getOrCreateToday(): Promise<ClosingRecord> {
    return CLOSING;
  }

  async getByDate(): Promise<ClosingRecord> {
    return CLOSING;
  }
}

describe('ReportService', () => {
  it('monta o relatório de hoje com os dados do fechamento', async () => {
    const source = new FakeReportSource();
    const report = await new ReportService(
      source,
      new FakeClosingLookup(),
    ).forToday();
    expect(source.askedClosingIds).toEqual([7]);
    expect(report).toMatchObject({
      businessDate: '2026-09-22',
      status: 'CLOSED',
      orders: { count: 1, total: '30.00' },
      expenses: { total: '10.00' },
    });
  });

  it('monta o relatório de uma data', async () => {
    const report = await new ReportService(
      new FakeReportSource(),
      new FakeClosingLookup(),
    ).forDate('2026-09-22');
    expect(report.byPaymentMethod[0]).toMatchObject({
      name: 'PIX',
      total: '30.00',
    });
  });
});
