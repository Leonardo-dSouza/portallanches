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
  /** A forma fiado (2026-10-25): o total é o "a receber", fora da gaveta. */
  isFiado: boolean;
}

/** O quadro "Recebido de fiado" da noite: por forma, com o adicional à parte. */
export interface FiadoReceived {
  count: number;
  /** O que abateu dos pedidos fiado (não conta de novo como venda). */
  total: Money;
  /** Adicional (juros) cobrado na hora de receber. */
  extra: Money;
  byPaymentMethod: PaymentMethodTotal[];
}

export interface ClosingReport {
  businessDate: string;
  status: ClosingStatus;
  orders: { count: number; total: Money };
  byPaymentMethod: PaymentMethodTotal[];
  withoutPaymentMethod: { count: number; total: Money };
  delivery: { count: number; feesTotal: Money };
  motoboy: { dailyRate: Money; deliveryFees: Money; totalCost: Money };
  expenses: { count: number; total: Money };
  /** Cancelados do dia, fora das somas acima (2026-10-15); ausente = nenhum. */
  canceled?: { count: number; total: Money };
  /**
   * Consumo interno pelo custo, fora dos gastos (2026-10-23); só no relatório do dia. O custo só
   * vem para o admin (2026-10-25); o caixa recebe só a quantidade.
   */
  staffConsumption?: ConsumptionCount & Partial<ConsumptionCost>;
  /** Recebido de fiado na noite (2026-10-25); só no relatório do dia. */
  fiadoReceived?: FiadoReceived;
  /** O que entrou na gaveta: as formas que não são fiado + o recebido + o adicional; só no dia. */
  cashIn?: Money;
}

/** Totais do período: espelha `PeriodTotals` do backend (`dailyRates` = soma das diárias). */
export interface PeriodTotals {
  orders: ClosingReport['orders'];
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
}
