import { formatCents, toCents } from '../common/money.js';
import type { ClosingRecord } from '../closing/closing-repository.js';
import type {
  ReportOrderRow,
  ReportPaymentMethodRow,
} from './report-source.js';

export interface PaymentMethodTotal {
  paymentMethodId: number;
  name: string;
  ordersCount: number;
  total: string;
}

export interface ClosingReport {
  businessDate: string;
  status: 'OPEN' | 'CLOSED';
  orders: { count: number; total: string };
  byPaymentMethod: PaymentMethodTotal[];
  delivery: { count: number; feesTotal: string };
  /** Custo do motoboy = diária do dia + soma das taxas de entrega. */
  motoboy: { dailyRate: string; deliveryFees: string; totalCost: string };
  expenses: { count: number; total: string };
}

export interface ReportInput {
  closing: ClosingRecord;
  orders: ReportOrderRow[];
  expenseAmounts: string[];
  paymentMethods: ReportPaymentMethodRow[];
}

const sumCents = (values: string[]): number =>
  values.reduce((sum, value) => sum + toCents(value), 0);

function totalsByPaymentMethod(
  orders: ReportOrderRow[],
  methods: ReportPaymentMethodRow[],
): PaymentMethodTotal[] {
  return methods
    .map((method) => {
      const own = orders.filter((o) => o.paymentMethodId === method.id);
      return {
        paymentMethodId: method.id,
        name: method.name,
        ordersCount: own.length,
        total: formatCents(sumCents(own.map((o) => o.amount))),
      };
    })
    .filter((entry) => entry.ordersCount > 0);
}

function motoboySummary(
  closing: ClosingRecord,
  feesCents: number,
): ClosingReport['motoboy'] {
  return {
    dailyRate: closing.motoboyDailyRate,
    deliveryFees: formatCents(feesCents),
    totalCost: formatCents(toCents(closing.motoboyDailyRate) + feesCents),
  };
}

function ordersSummary(orders: ReportOrderRow[]): ClosingReport['orders'] {
  return {
    count: orders.length,
    total: formatCents(sumCents(orders.map((o) => o.amount))),
  };
}

function deliverySummary(
  orders: ReportOrderRow[],
  feesCents: number,
): ClosingReport['delivery'] {
  return {
    count: orders.filter((o) => o.type === 'DELIVERY').length,
    feesTotal: formatCents(feesCents),
  };
}

/**
 * Monta o relatório de fechamento a partir dos dados do dia (função pura).
 * Somas em centavos inteiros; formas de pagamento sem pedidos ficam de fora.
 *
 * @example buildClosingReport({ closing, orders, expenseAmounts: ['120.00'], paymentMethods })
 */
export function buildClosingReport(input: ReportInput): ClosingReport {
  const { closing, orders, expenseAmounts, paymentMethods } = input;
  const feesCents = sumCents(orders.map((o) => o.deliveryFee));
  return {
    businessDate: closing.businessDate,
    status: closing.status,
    orders: ordersSummary(orders),
    byPaymentMethod: totalsByPaymentMethod(orders, paymentMethods),
    delivery: deliverySummary(orders, feesCents),
    motoboy: motoboySummary(closing, feesCents),
    expenses: {
      count: expenseAmounts.length,
      total: formatCents(sumCents(expenseAmounts)),
    },
  };
}
