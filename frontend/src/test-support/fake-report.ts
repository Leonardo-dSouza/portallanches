import type { StaffConsumption } from '../api/staff-consumption-types';
import type {
  ClosingReport,
  ClosingStatus,
  Expense,
  Order,
  PaymentMethodTotal,
} from '../api/types';

/** O que o relatório do fake lê do `FakeApiClient`. */
export interface FakeReportSource {
  orders: Order[];
  expenses: Expense[];
  closingStatus: ClosingStatus;
  /** O fake não soma por forma; o teste define as linhas. */
  reportPayments: PaymentMethodTotal[];
  staffConsumptions: StaffConsumption[];
}

/** Consumo interno do dia pelo custo, à parte dos gastos (2026-10-23). */
function staffTotals(consumptions: StaffConsumption[]) {
  const cents = consumptions.reduce(
    (total, c) => total + Math.round(Number(c.cmvTotal) * 100),
    0,
  );
  const missing = consumptions.reduce(
    (total, c) => total + c.missingCostCount,
    0,
  );
  return {
    count: consumptions.length,
    cmvTotal: (cents / 100).toFixed(2),
    missingCostCount: missing,
  };
}

const sum = (orders: Order[]) =>
  orders.reduce((total, o) => total + Number(o.amount), 0).toFixed(2);

/**
 * Relatório do dia como o backend: os cancelados (2026-10-15) ficam fora do total e vêm à parte.
 *
 * @example fakeDayReport(api).canceled // { count: 1, total: '17.80' }
 */
export function fakeDayReport(source: FakeReportSource): ClosingReport {
  const active = source.orders.filter((o) => o.canceledAt === null);
  const canceled = source.orders.filter((o) => o.canceledAt !== null);
  return {
    businessDate: '2026-09-22',
    status: source.closingStatus,
    orders: { count: active.length, total: sum(active) },
    byPaymentMethod: source.reportPayments,
    withoutPaymentMethod: { count: 0, total: '0.00' },
    delivery: { count: 0, feesTotal: '0.00' },
    motoboy: { dailyRate: '40.00', deliveryFees: '0.00', totalCost: '40.00' },
    expenses: { count: source.expenses.length, total: '0.00' },
    canceled: { count: canceled.length, total: sum(canceled) },
    staffConsumption: staffTotals(source.staffConsumptions),
  };
}
