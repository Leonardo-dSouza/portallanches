import type { ClosingLookup } from '../closing/closing-lookup.js';
import type { ClosingRecord } from '../closing/closing-repository.js';
import type {
  ReportFiadoPaymentRow,
  ReportOrderRow,
  ReportPaymentMethodRow,
  ReportSource,
} from './report-source.js';
import type { SessionUser } from '../auth/session-user.js';
import { ReportService } from './report.service.js';
import type { ConsumptionCost } from '../staff-consumption/consumption-cost.js';

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
        paymentMode: null,
        deliveryFee: '0.00',
      },
    ];
  }

  async listExpenseAmounts(): Promise<string[]> {
    return ['10.00'];
  }

  async listPaymentMethods(): Promise<ReportPaymentMethodRow[]> {
    return [
      {
        id: 1,
        name: 'PIX',
        sortOrder: 0,
        isCardTerminal: false,
        isFiado: false,
      },
    ];
  }

  async listStaffConsumptionCosts(): Promise<ConsumptionCost[]> {
    return [{ cmvTotal: '6.15', missingCostCount: 1 }];
  }

  /** Um fiado de outra noite recebido nesta, no PIX, com R$ 2 de adicional. */
  async listFiadoPayments(closingId: number): Promise<ReportFiadoPaymentRow[]> {
    this.askedClosingIds.push(closingId);
    return [
      { amount: '12.00', extra: '2.00', paymentMethodId: 1, paymentMode: null },
    ];
  }
}

const USER: SessionUser = { id: 2, name: 'caixa', role: 'CAIXA' };

class FakeClosingLookup implements ClosingLookup {
  async getFor(): Promise<ClosingRecord> {
    return CLOSING;
  }

  async getOrCreateFor(): Promise<ClosingRecord> {
    return CLOSING;
  }

  async getById(): Promise<ClosingRecord> {
    return CLOSING;
  }

  assertEditable(): void {}

  assertViewable(): void {}

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
    ).forSelected(USER);
    expect(source.askedClosingIds).toEqual([7, 7]);
    expect(report).toMatchObject({
      businessDate: '2026-09-22',
      status: 'CLOSED',
      orders: { count: 1, total: '30.00' },
      expenses: { total: '10.00' },
    });
  });

  it('traz o consumo interno do dia pelo custo', async () => {
    const report = await new ReportService(
      new FakeReportSource(),
      new FakeClosingLookup(),
    ).forSelected(USER);
    expect(report.staffConsumption).toEqual({
      count: 1,
      cmvTotal: '6.15',
      missingCostCount: 1,
    });
  });

  it('traz o recebido de fiado da noite (2026-10-25)', async () => {
    const report = await new ReportService(
      new FakeReportSource(),
      new FakeClosingLookup(),
    ).forSelected(USER);
    expect(report.fiadoReceived).toMatchObject({
      count: 1,
      total: '12.00',
      extra: '2.00',
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
