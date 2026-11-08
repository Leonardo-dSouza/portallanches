import { formatCents, toCents } from '../common/money.js';
import type { ClosingRecord } from '../closing/closing-repository.js';
import { hadBusiness } from '../closing/had-business.js';
import {
  sumConsumptionCosts,
  type ConsumptionCost,
  type ConsumptionTotals,
} from '../staff-consumption/consumption-cost.js';
import {
  fiadoReceivedSummary,
  type FiadoReceived,
  type FiadoReceiptLine,
  type FiadoSoldLine,
} from './fiado-report.js';
import { sumCents, type PaymentMethodTotal } from './payment-totals.js';
import {
  cashByPaymentMethod,
  isOpenAccount,
  paidOnTheSpot,
  revenueCents,
} from './revenue.js';
import type {
  ReportFiadoPaymentRow,
  ReportOrderRow,
  ReportPaymentMethodRow,
} from './report-source.js';

// Somas por forma de pagamento: em `payment-totals.ts` (o fiado usa as mesmas, 2026-10-25).
export {
  sumCents,
  type PaymentMethodTotal,
  type PaymentModeTotal,
} from './payment-totals.js';

export interface ClosingReport {
  businessDate: string;
  status: 'OPEN' | 'CLOSED';
  /** Sem expediente (2026-11-08): nenhum pedido válido na noite (ou todos cancelados). */
  noBusiness: boolean;
  orders: { count: number; total: string };
  /** Os pedidos sem os fiados (2026-10-27): o "Pedidos" do quadro Vendas. */
  ordersWithoutFiado: { count: number; total: string };
  /**
   * O faturamento da noite (2026-11-01): pedidos pagos na hora mais o recebido de fiado com o
   * adicional. O fiado vendido na noite fica fora até ser pago.
   */
  revenue: string;
  /** Tudo que entrou em cada forma, o recebido de fiado junto (2026-11-01). */
  byPaymentMethod: PaymentMethodTotal[];
  /** Pedidos sem forma de pagamento (importados da planilha histórica): fecham a soma com `orders`. */
  withoutPaymentMethod: { count: number; total: string };
  /** Contas A pagar da noite (card 8, 2026-11-08): fora do faturamento até receber. */
  openAccounts: { count: number; total: string };
  delivery: { count: number; feesTotal: string };
  /** Custo do motoboy = diária do dia + soma das taxas de entrega. */
  motoboy: { dailyRate: string; deliveryFees: string; totalCost: string };
  expenses: { count: number; total: string };
  /** Cancelados do dia (2026-10-15): fora de todas as somas acima, com o motivo de cada um. */
  canceled: { count: number; total: string; orders: CanceledOrderLine[] };
  /**
   * Consumo interno (2026-10-23): pelo custo, à parte (não saiu dinheiro da gaveta). Só no
   * relatório do dia; o período tem o bloco próprio na Análise.
   */
  staffConsumption?: ConsumptionTotals;
  /** Recebido de fiado na noite (2026-10-25); no faturamento desde 2026-11-01. */
  fiadoReceived: FiadoReceived;
  /** Quem pagou na noite (2026-11-01). Só no relatório do dia. */
  fiadoReceipts?: FiadoReceiptLine[];
  /** Os fiados vendidos na noite, com a situação de hoje (2026-11-01). Só no relatório do dia. */
  fiadoSold?: FiadoSoldLine[];
}

/** Um cancelado no quadro Vendas (2026-10-27): "#12 Pedido duplicado", fora do total. */
export interface CanceledOrderLine {
  dayNumber: number;
  amount: string;
  reason: string | null;
}

export interface ReportInput {
  closing: ClosingRecord;
  orders: ReportOrderRow[];
  expenseAmounts: string[];
  paymentMethods: ReportPaymentMethodRow[];
  /** Custo de cada consumo interno do dia; ausente nas noites do relatório de período. */
  staffConsumptionCosts?: ConsumptionCost[];
  /** Recebimentos de fiado da noite: entram no faturamento e nas formas. */
  fiadoPayments: ReportFiadoPaymentRow[];
  /** Noite em andamento no caixa (2026-11-08): não vira "Sem expediente" no Histórico só por não ter pedidos ainda. */
  isLive?: boolean;
}

/** Taxas de entrega em centavos; pedido sem taxa informada (importado) conta como 0. */
export function sumDeliveryFeesCents(orders: ReportOrderRow[]): number {
  return sumCents(
    orders.flatMap((o) => (o.deliveryFee ? [o.deliveryFee] : [])),
  );
}

export function withoutPaymentMethodSummary(
  orders: ReportOrderRow[],
): ClosingReport['withoutPaymentMethod'] {
  // Só os importados da planilha (sem tipo e sem forma); o A pagar vai em `openAccounts` (card 8).
  const own = orders.filter(
    (o) => o.paymentMethodId === null && !isOpenAccount(o),
  );
  return {
    count: own.length,
    total: formatCents(sumCents(own.map((o) => o.amount))),
  };
}

function motoboySummary(
  closing: ClosingRecord,
  feesCents: number,
  business: boolean,
): ClosingReport['motoboy'] {
  // Sem expediente (ou noite ao vivo antes do 1º pedido), a diária não entra no custo.
  const dailyRate = business ? closing.motoboyDailyRate : '0.00';
  return {
    dailyRate,
    deliveryFees: formatCents(feesCents),
    totalCost: formatCents(toCents(dailyRate) + feesCents),
  };
}

export function ordersSummary(
  orders: ReportOrderRow[],
): ClosingReport['orders'] {
  return {
    count: orders.length,
    total: formatCents(sumCents(orders.map((o) => o.amount))),
  };
}

/** Os cancelados à parte, na ordem do número do dia. */
function canceledSummary(orders: ReportOrderRow[]): ClosingReport['canceled'] {
  const lines = orders.flatMap((o) =>
    o.canceled
      ? [
          {
            dayNumber: o.canceled.dayNumber,
            amount: o.amount,
            reason: o.canceled.reason,
          },
        ]
      : [],
  );
  return {
    ...ordersSummary(orders.filter((o) => o.canceled)),
    orders: lines.sort((a, b) => a.dayNumber - b.dayNumber),
  };
}

export function deliverySummary(
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
 * Somas em centavos inteiros; formas de pagamento sem movimento ficam de fora.
 *
 * @example buildClosingReport({ closing, orders, expenseAmounts: ['120.00'], paymentMethods })
 */
export function buildClosingReport(input: ReportInput): ClosingReport {
  const { closing, expenseAmounts, paymentMethods, fiadoPayments } = input;
  const business = hadBusiness(input.orders);
  const orders = input.orders.filter((o) => !o.canceled);
  const feesCents = sumDeliveryFeesCents(orders);
  return {
    businessDate: closing.businessDate,
    status: closing.status,
    noBusiness: !business && !input.isLive,
    orders: ordersSummary(orders),
    ordersWithoutFiado: ordersSummary(paidOnTheSpot(orders, paymentMethods)),
    revenue: formatCents(revenueCents(orders, fiadoPayments, paymentMethods)),
    byPaymentMethod: cashByPaymentMethod(orders, fiadoPayments, paymentMethods),
    withoutPaymentMethod: withoutPaymentMethodSummary(orders),
    openAccounts: ordersSummary(orders.filter(isOpenAccount)),
    delivery: deliverySummary(orders, feesCents),
    motoboy: motoboySummary(closing, feesCents, business),
    expenses: {
      count: expenseAmounts.length,
      total: formatCents(sumCents(expenseAmounts)),
    },
    canceled: canceledSummary(input.orders),
    ...(input.staffConsumptionCosts && {
      staffConsumption: sumConsumptionCosts(input.staffConsumptionCosts),
    }),
    fiadoReceived: fiadoReceivedSummary(fiadoPayments),
  };
}
