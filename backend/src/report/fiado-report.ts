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
 * O recebido de fiado da noite, por forma e com o adicional à parte. O recebido não conta de
 * novo como venda. O "Entrou no caixa" (quadro Gaveta) saiu a pedido do usuário em 2026-10-27.
 *
 * @example fiadoReceivedSummary(payments, methods).extra // '6.00'
 */
export function fiadoReceivedSummary(
  payments: ReportFiadoPaymentRow[],
  methods: ReportPaymentMethodRow[],
): FiadoReceived {
  return {
    count: payments.length,
    total: formatCents(sumCents(payments.map((p) => p.amount))),
    extra: formatCents(sumCents(payments.map((p) => p.extra))),
    byPaymentMethod: totalsByPaymentMethod(payments, methods),
  };
}
