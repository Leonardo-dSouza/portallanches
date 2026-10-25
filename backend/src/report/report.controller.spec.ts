import { costKeysIn } from '../auth/cost-keys.fixture.js';
import type { SessionUser } from '../auth/session-user.js';
import type { ClosingReport } from './report-builder.js';
import { ReportController } from './report.controller.js';
import type { ReportService } from './report.service.js';

const ADMIN: SessionUser = { id: 1, name: 'admin', role: 'ADMIN' };
const CAIXA: SessionUser = { id: 2, name: 'caixa', role: 'CAIXA' };

const REPORT: ClosingReport = {
  businessDate: '2026-10-25',
  status: 'OPEN',
  orders: { count: 1, total: '30.00' },
  byPaymentMethod: [],
  withoutPaymentMethod: { count: 0, total: '0.00' },
  delivery: { count: 0, feesTotal: '0.00' },
  motoboy: { dailyRate: '40.00', deliveryFees: '0.00', totalCost: '40.00' },
  expenses: { count: 1, total: '10.00' },
  canceled: { count: 0, total: '0.00' },
  staffConsumption: { count: 2, cmvTotal: '15.73', missingCostCount: 1 },
};

/** O relatório pronto, como o serviço devolve para o dia selecionado. */
class FixedReports {
  async forSelected(): Promise<ClosingReport> {
    return REPORT;
  }
}

const controller = new ReportController(
  new FixedReports() as unknown as ReportService,
);

// Regressão de 2026-10-25: o Relatório do caixa recebia o custo do consumo interno.
describe('ReportController (relatório de hoje)', () => {
  it('o caixa recebe o consumo interno só com a quantidade', async () => {
    const report = await controller.today(CAIXA);
    expect(report.staffConsumption).toEqual({ count: 2 });
    expect(costKeysIn(report)).toEqual([]);
    // O que a casa paga ao motoboy não é custo do cardápio: continua.
    expect(report.motoboy.totalCost).toBe('40.00');
  });

  it('o admin recebe o custo do consumo interno', async () => {
    expect(await controller.today(ADMIN)).toEqual(REPORT);
  });

  it('dia sem consumo continua sem o bloco', async () => {
    const { staffConsumption: _staff, ...withoutStaff } = REPORT;
    const fixed = new FixedReports();
    fixed.forSelected = async () => withoutStaff;
    const report = await new ReportController(
      fixed as unknown as ReportService,
    ).today(CAIXA);
    expect(report.staffConsumption).toBeUndefined();
  });
});
