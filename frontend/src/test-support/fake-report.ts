import type { StaffConsumption } from '../api/staff-consumption-types';
import type {
  ClosingReport,
  ClosingStatus,
  Expense,
  Order,
  PaymentMethodTotal,
  UserRole,
} from '../api/types';
import { asSeenBy } from './fake-costs';
import { isOpenAccount } from '../cash/order-filters';

/** O que o relatório do fake lê do `FakeApiClient`. */
export interface FakeReportSource {
  orders: Order[];
  expenses: Expense[];
  closingStatus: ClosingStatus;
  /** O fake não soma por forma; o teste define as linhas. */
  reportPayments: PaymentMethodTotal[];
  staffConsumptions: StaffConsumption[];
  /** O caixa recebe o consumo só com a quantidade (2026-10-25). */
  role: UserRole;
}

/** Consumo interno do dia pelo custo, à parte dos gastos (2026-10-23). */
function staffTotals(consumptions: StaffConsumption[]) {
  const cents = consumptions.reduce(
    (total, c) => total + Math.round(Number(c.cmvTotal) * 100),
    0,
  );
  const missing = consumptions.reduce(
    (total, c) => total + (c.missingCostCount ?? 0),
    0,
  );
  return {
    count: consumptions.length,
    cmvTotal: (cents / 100).toFixed(2),
    missingCostCount: missing,
  };
}

const sum = (items: readonly { amount: string }[]) =>
  items.reduce((total, o) => total + Number(o.amount), 0).toFixed(2);

/** Os pedidos fora do fiado: só eles entram no faturamento da noite (2026-11-01). */
function withoutFiado(orders: Order[]) {
  const own = orders.filter((o) => !o.fiado);
  return { count: own.length, total: sum(own) };
}

/** Contas A pagar da noite ainda abertas (2026-11-08): fora do faturamento. */
function openAccountsSummary(orders: Order[]) {
  const open = orders.filter((o) => isOpenAccount(o) && o.canceledAt === null);
  return { count: open.length, total: sum(open) };
}

/** Cada cancelado com o número e o motivo, na ordem do número. */
const canceledLines = (orders: Order[]) =>
  orders
    .map((o) => ({
      dayNumber: o.dayNumber,
      amount: o.amount,
      reason: o.cancelReason,
    }))
    .sort((a, b) => a.dayNumber - b.dayNumber);

/**
 * Relatório do dia como o backend: os cancelados (2026-10-15) ficam fora do total e vêm à parte.
 *
 * @example fakeDayReport(api).canceled // { count: 1, total: '17.80' }
 */
export function fakeDayReport(source: FakeReportSource): ClosingReport {
  const active = source.orders.filter((o) => o.canceledAt === null);
  const canceled = source.orders.filter((o) => o.canceledAt !== null);
  const paid = withoutFiado(active);
  const hadBusiness = active.length > 0;
  const motoboyRate = hadBusiness ? '40.00' : '0.00';
  const activeExpenses = source.expenses.filter((e) => !e.canceledAt);
  return {
    businessDate: '2026-09-22',
    status: source.closingStatus,
    noBusiness: !hadBusiness,
    orders: { count: active.length, total: sum(active) },
    splitOrdersCount: active.filter((o) => (o.paymentParts?.length ?? 0) >= 2)
      .length,
    ordersWithoutFiado: paid,
    revenue: paid.total,
    byPaymentMethod: source.reportPayments,
    withoutPaymentMethod: { count: 0, total: '0.00' },
    openAccounts: openAccountsSummary(active),
    delivery: { count: 0, feesTotal: '0.00' },
    motoboy: {
      dailyRate: motoboyRate,
      deliveryFees: '0.00',
      totalCost: motoboyRate,
    },
    expenses: { count: activeExpenses.length, total: sum(activeExpenses) },
    canceled: {
      count: canceled.length,
      total: sum(canceled),
      orders: canceledLines(canceled),
    },
    staffConsumption: asSeenBy(
      source.role,
      staffTotals(source.staffConsumptions),
    ),
    fiadoReceived: { count: 0, total: '0.00', extra: '0.00', received: '0.00' },
  };
}
