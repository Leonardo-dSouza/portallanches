import { BadRequestException } from '@nestjs/common';
import { parseBusinessDate } from '../closing/business-date.js';
import { parseChoice, parseId, parseObject } from '../common/input-parsers.js';
import { parseMoney } from '../common/money.js';
import type { PaymentMode } from '../orders/order-input.js';

const PAYMENT_MODES: readonly PaymentMode[] = ['CREDIT', 'DEBIT', 'PIX'];

/** Recebimento de fiado já validado (formato; o que falta e a forma dependem do banco). */
export interface FiadoPaymentInput {
  /** Quanto abate do pedido (de 0,01 até o que falta). */
  amount: string;
  /** Adicional (juros) opcional (2026-10-25): soma na gaveta, fora das vendas. */
  extra: string;
  paymentMethodId: number;
  /** Só na maquininha. */
  paymentMode: PaymentMode | null;
  /** Noite em que entra na gaveta; null = a noite em andamento. */
  date: string | null;
}

const isBlank = (raw: unknown): boolean =>
  raw === undefined || raw === null || raw === '';

/**
 * Valida o corpo do Receber (`POST /fiado/orders/:id/payments`).
 *
 * @example parseFiadoPaymentInput({ amount: 20, extra: 5, paymentMethodId: 1 }) // { amount: '20.00', extra: '5.00', … }
 */
export function parseFiadoPaymentInput(body: unknown): FiadoPaymentInput {
  const fields = parseObject(body, 'recebimento de fiado');
  return {
    amount: parseMoney(fields.amount, 'amount', false),
    extra: isBlank(fields.extra)
      ? '0.00'
      : parseMoney(fields.extra, 'extra', true),
    paymentMethodId: parseId(fields.paymentMethodId, 'paymentMethodId'),
    paymentMode: isBlank(fields.paymentMode)
      ? null
      : parseChoice(fields.paymentMode, 'paymentMode', PAYMENT_MODES),
    date: isBlank(fields.date) ? null : parseBusinessDate(String(fields.date)),
  };
}

/**
 * Valida o corpo do Remarcar (`PUT /fiado/orders/:id/due-date`): a data nova ou null ("Sem data").
 * O campo é obrigatório, para o PUT vazio não apagar a previsão sem querer.
 *
 * @example parseFiadoDueDateInput({ dueDate: '2026-10-30' }) // '2026-10-30'
 */
export function parseFiadoDueDateInput(body: unknown): string | null {
  const { dueDate } = parseObject(body, 'previsão do fiado');
  if (dueDate === null) return null;
  if (typeof dueDate === 'string') return parseBusinessDate(dueDate);
  throw new BadRequestException(
    `Campo "dueDate" inválido: recebido ${JSON.stringify(dueDate)}, esperado data YYYY-MM-DD ou null (sem data)`,
  );
}
