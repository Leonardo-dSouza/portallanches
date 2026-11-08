import type {
  ConsumptionCost,
  ConsumptionCount,
} from './staff-consumption-types';
import type { ClosingStatus, DateRange, Money, PaymentMode } from './types';

export interface PaymentModeTotal {
  mode: PaymentMode;
  ordersCount: number;
  total: Money;
}

export interface PaymentMethodTotal {
  paymentMethodId: number;
  name: string;
  ordersCount: number;
  total: Money;
  /** Subtotal de cada meio nas maquininhas; vazio nas outras formas. */
  byMode: PaymentModeTotal[];
}

/** O recebido de fiado da noite (2026-10-25); soma no faturamento desde 2026-11-01. */
export interface FiadoReceived {
  count: number;
  /** O que abateu dos pedidos fiado. */
  total: Money;
  /** Adicional (juros) cobrado na hora de receber. */
  extra: Money;
  /** O que entrou: `total` mais `extra`. */
  received: Money;
}

/** Quem pagou o quê na noite (2026-11-01). */
export interface FiadoReceiptLine {
  orderDayNumber: number;
  /** A noite do pedido pago. */
  orderBusinessDate: string;
  customerName: string | null;
  amount: Money;
  extra: Money;
  /** O que entrou: `amount` mais `extra`. */
  received: Money;
  paymentMethodName: string;
  paymentMode: PaymentMode | null;
}

/** Um fiado vendido na noite e a situação dele hoje (2026-11-01). */
export interface FiadoSoldLine {
  dayNumber: number;
  customerName: string | null;
  amount: Money;
  paidTotal: Money;
  remaining: Money;
  /** Última noite com pagamento; null sem nenhum. */
  lastPaidOn: string | null;
}

/** Um cancelado no quadro Vendas (2026-10-27): "#12 Pedido duplicado", fora do total. */
export interface CanceledOrderLine {
  dayNumber: number;
  amount: Money;
  reason: string | null;
}

export interface ClosingReport {
  businessDate: string;
  status: ClosingStatus;
  /** Noite sem expediente (2026-11-08): nenhum pedido válido na noite (ou todos cancelados). */
  noBusiness?: boolean;
  orders: { count: number; total: Money };
  /** Pedidos pagos com mais de uma forma (card 2, 2026-11-08). */
  splitOrdersCount: number;
  /** Os pedidos sem os fiados (2026-10-27): o "Pedidos" do quadro Vendas. */
  ordersWithoutFiado: { count: number; total: Money };
  /** O faturamento da noite (2026-11-01): pago na hora mais o recebido de fiado com o adicional. */
  revenue: Money;
  /** Tudo que entrou em cada forma, o recebido de fiado junto (2026-11-01). */
  byPaymentMethod: PaymentMethodTotal[];
  withoutPaymentMethod: { count: number; total: Money };
  /**
   * Contas A pagar da noite ainda não recebidas (2026-11-08); fora do faturamento até receber.
   * Só no dia aberto; no fechado não existem contas abertas.
   */
  openAccounts?: { count: number; total: Money };
  delivery: { count: number; feesTotal: Money };
  motoboy: { dailyRate: Money; deliveryFees: Money; totalCost: Money };
  expenses: { count: number; total: Money };
  /** Cancelados do dia, fora das somas acima (2026-10-15), com o motivo (2026-10-27). */
  canceled?: { count: number; total: Money; orders: CanceledOrderLine[] };
  /**
   * Consumo interno pelo custo, fora dos gastos (2026-10-23); só no relatório do dia. O custo só
   * vem para o admin (2026-10-25); o caixa recebe só a quantidade.
   */
  staffConsumption?: ConsumptionCount & Partial<ConsumptionCost>;
  /** Recebido de fiado na noite (2026-10-25). */
  fiadoReceived: FiadoReceived;
  /** Quem pagou na noite (2026-11-01); só no relatório do dia. */
  fiadoReceipts?: FiadoReceiptLine[];
  /** Os fiados vendidos na noite, fora do faturamento dela (2026-11-01); só no relatório do dia. */
  fiadoSold?: FiadoSoldLine[];
}

/** Totais do período: espelha `PeriodTotals` do backend (`dailyRates` = soma das diárias). */
export interface PeriodTotals {
  orders: ClosingReport['orders'];
  revenue: Money;
  byPaymentMethod: PaymentMethodTotal[];
  withoutPaymentMethod: ClosingReport['withoutPaymentMethod'];
  delivery: ClosingReport['delivery'];
  motoboy: { dailyRates: Money; deliveryFees: Money; totalCost: Money };
  expenses: ClosingReport['expenses'];
}

/** Um relatório por dia com fechamento (ordem crescente) e o total do período. */
export interface PeriodReport extends DateRange {
  days: ClosingReport[];
  totals: PeriodTotals;
  /** Pedidos pagos com mais de uma forma no período (card 2, 2026-11-08). */
  splitOrdersCount: number;
}
