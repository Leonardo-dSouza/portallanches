import { parseChoice, parseId, parseObject } from '../common/input-parsers.js';
import { parseMoney } from '../common/money.js';
import type { PaymentMode } from './order-input.js';
import { parseSplitChoice, type PaymentPart } from './payment-parts.js';

const PAYMENT_MODES: readonly PaymentMode[] = ['CREDIT', 'DEBIT', 'PIX'];

const isAbsent = (value: unknown): boolean =>
  value === undefined || value === null;

/** Corpo validado do Receber do A pagar (card 8, 2026-11-08). */
export interface OpenAccountPayment {
  paymentMethodId: number;
  /** Meio na maquininha; null nas outras formas. */
  paymentMode: PaymentMode | null;
  /** "Troco para" no dinheiro; null sem troco. */
  changeFor: string | null;
  /** Partes do pagamento quando dividido entre 2+ formas (vazio = forma única). */
  paymentParts: PaymentPart[];
}

type OpenPaymentChoice = Omit<OpenAccountPayment, 'changeFor'>;

/** A forma única (obrigatória) ou, no pagamento dividido (card 2), as partes. */
function parseOpenPaymentChoice(
  fields: Record<string, unknown>,
): OpenPaymentChoice {
  const split = parseSplitChoice(fields, 'Recebimento');
  if (split) return split;
  return {
    paymentParts: [],
    paymentMethodId: parseId(fields.paymentMethodId, 'paymentMethodId'),
    paymentMode: isAbsent(fields.paymentMode)
      ? null
      : parseChoice(fields.paymentMode, 'paymentMode', PAYMENT_MODES),
  };
}

/**
 * Lê o corpo do Receber: a forma é obrigatória (direta ou pelas partes); o meio e o troco, opcionais.
 *
 * @example parseOpenAccountPayment({ paymentMethodId: 2, changeFor: '50.00' })
 */
export function parseOpenAccountPayment(body: unknown): OpenAccountPayment {
  const fields = parseObject(body, 'recebimento do A pagar');
  const payment = parseOpenPaymentChoice(fields);
  const changeFor = isAbsent(fields.changeFor)
    ? null
    : parseMoney(fields.changeFor, 'changeFor', false);
  return { ...payment, changeFor };
}
