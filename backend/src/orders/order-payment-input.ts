import { parseChoice, parseId, parseObject } from '../common/input-parsers.js';
import { parseMoney } from '../common/money.js';
import type { PaymentMode } from './order-input.js';

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
}

/**
 * Lê o corpo do Receber: a forma é obrigatória; o meio e o troco, opcionais (a regra de cada
 * um é conferida depois, com a forma em mãos).
 *
 * @example parseOpenAccountPayment({ paymentMethodId: 2, changeFor: '50.00' })
 */
export function parseOpenAccountPayment(body: unknown): OpenAccountPayment {
  const fields = parseObject(body, 'recebimento do A pagar');
  return {
    paymentMethodId: parseId(fields.paymentMethodId, 'paymentMethodId'),
    paymentMode: isAbsent(fields.paymentMode)
      ? null
      : parseChoice(fields.paymentMode, 'paymentMode', PAYMENT_MODES),
    changeFor: isAbsent(fields.changeFor)
      ? null
      : parseMoney(fields.changeFor, 'changeFor', false),
  };
}
