import { formatCents } from '../common/money.js';
import {
  sumCents,
  totalsByPaymentMethod,
  type PaymentMethodTotal,
} from './payment-totals.js';
import type {
  ReportFiadoPaymentRow,
  ReportPaymentMethodRow,
} from './report-source.js';

/** O quadro "Recebido de fiado" da noite (2026-10-25): por forma e o adicional à parte. */
export interface FiadoReceived {
  count: number;
  /** O que abateu dos pedidos fiado. */
  total: string;
  /** Adicional (juros) cobrado na hora de receber. */
  extra: string;
  byPaymentMethod: PaymentMethodTotal[];
}

/**
 * O recebido de fiado e o que entrou na gaveta: as formas que não são fiado (a venda fiada fica
 * "a receber") + o recebido + o adicional. O recebido não conta de novo como venda.
 *
 * @example fiadoReceivedSummary(payments, byPaymentMethod, methods).cashIn // '135.30'
 */
export function fiadoReceivedSummary(
  payments: ReportFiadoPaymentRow[],
  byPaymentMethod: PaymentMethodTotal[],
  methods: ReportPaymentMethodRow[],
): { fiadoReceived: FiadoReceived; cashIn: string } {
  const totalCents = sumCents(payments.map((p) => p.amount));
  const extraCents = sumCents(payments.map((p) => p.extra));
  const salesCents = sumCents(
    byPaymentMethod.filter((m) => !m.isFiado).map((m) => m.total),
  );
  return {
    fiadoReceived: {
      count: payments.length,
      total: formatCents(totalCents),
      extra: formatCents(extraCents),
      byPaymentMethod: totalsByPaymentMethod(payments, methods),
    },
    cashIn: formatCents(salesCents + totalCents + extraCents),
  };
}
