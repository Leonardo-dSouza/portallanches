import type { SessionUser } from '../auth/session-user.js';
import type { ClosingReport } from './report-builder.js';
import { reportFor } from './report-view.js';

const ADMIN: SessionUser = { id: 1, name: 'admin', role: 'ADMIN' };
const CAIXA: SessionUser = { id: 2, name: 'caixa', role: 'CAIXA' };

const FULL_REPORT: ClosingReport = {
  businessDate: '2026-11-12',
  status: 'OPEN',
  noBusiness: false,
  orders: { count: 10, total: '250.00' },
  ordersWithoutFiado: { count: 8, total: '200.00' },
  splitOrdersCount: 2,
  revenue: '230.00',
  byPaymentMethod: [
    {
      paymentMethodId: 1,
      name: 'Dinheiro',
      ordersCount: 5,
      total: '100.00',
      byMode: [],
    },
  ],
  withoutPaymentMethod: { count: 0, total: '0.00' },
  openAccounts: { count: 0, total: '0.00' },
  delivery: { count: 3, feesTotal: '15.00' },
  motoboy: { dailyRate: '40.00', deliveryFees: '15.00', totalCost: '55.00' },
  expenses: { count: 1, total: '20.00' },
  canceled: { count: 0, total: '0.00', orders: [] },
  staffConsumption: { count: 2, cmvTotal: '18.50', missingCostCount: 0 },
  fiadoReceived: { count: 1, total: '30.00', extra: '0.00', received: '30.00' },
  drawer: {
    openingCash: '30.00',
    cashTolerance: '2.00',
    countRequired: true,
    toCount: [{ paymentMethodId: 1, name: 'Dinheiro', isCash: true }],
    check: {
      countedBy: 'Maria',
      countedAt: '2026-11-12T23:00:00.000Z',
      note: 'Conferido',
      lines: [
        {
          paymentMethodId: 1,
          name: 'Dinheiro',
          expected: '130.00',
          counted: '130.00',
          difference: '0.00',
          verdict: 'MATCH',
        },
      ],
    },
  },
};

describe('report-view (reportFor)', () => {
  it('admin sempre recebe tudo, inclusive com a noite aberta', () => {
    const view = reportFor(ADMIN, FULL_REPORT);
    expect(view).toEqual(FULL_REPORT);
    expect(view.revenue).toBe('230.00');
    expect(view.byPaymentMethod).toHaveLength(1);
    expect(view.drawer.check).not.toBeNull();
    expect(view.staffConsumption).toEqual({
      count: 2,
      cmvTotal: '18.50',
      missingCostCount: 0,
    });
  });

  it('caixa com noite aberta não recebe campos de vendas e recebe drawer.check como null', () => {
    const view = reportFor(CAIXA, FULL_REPORT);

    // Campos de venda que somem na contagem cega
    expect(view.revenue).toBeUndefined();
    expect(view.ordersWithoutFiado).toBeUndefined();
    expect(view.byPaymentMethod).toBeUndefined();
    expect(view.withoutPaymentMethod).toBeUndefined();
    expect(view.splitOrdersCount).toBeUndefined();

    // Check fica null na noite aberta para o caixa
    expect(view.drawer.check).toBeNull();

    // O resto da conferência e do relatório fica
    expect(view.drawer.toCount).toEqual([
      { paymentMethodId: 1, name: 'Dinheiro', isCash: true },
    ]);
    expect(view.drawer.openingCash).toBe('30.00');
    expect(view.drawer.countRequired).toBe(true);
    expect(view.orders).toEqual({ count: 10, total: '250.00' });

    // Consumo interno sem custo
    expect(view.staffConsumption).toEqual({ count: 2 });
  });

  it('caixa com noite fechada recebe vendas e drawer.check normalmente', () => {
    const closedReport: ClosingReport = {
      ...FULL_REPORT,
      status: 'CLOSED',
    };
    const view = reportFor(CAIXA, closedReport);

    expect(view.revenue).toBe('230.00');
    expect(view.ordersWithoutFiado).toEqual({ count: 8, total: '200.00' });
    expect(view.byPaymentMethod).toHaveLength(1);
    expect(view.splitOrdersCount).toBe(2);
    expect(view.drawer.check).not.toBeNull();

    // Custo de consumo interno continua oculto para caixa
    expect(view.staffConsumption).toEqual({ count: 2 });
  });
});
