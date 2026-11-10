import { BadRequestException } from '@nestjs/common';
import {
  parseBoolean,
  parseNonNegativeInt,
  parseObject,
} from '../common/input-parsers.js';

// A pagar (tecla 0) e Dividir (tecla D) entre as formas de pagamento (2026-11-10, pedido do dono:
// mover e desligar em Cadastros → Pagamentos). Não são formas no banco: só o lugar na fileira das
// teclas e se aparecem. A API dos pedidos não muda o que aceita.

/** Lugar de uma tecla especial na fileira (0 = primeira) e se ela aparece no caixa. */
export interface SpecialPaymentKey {
  position: number;
  active: boolean;
}

export interface PaymentKeyLayout {
  openAccount: SpecialPaymentKey;
  split: SpecialPaymentKey;
}

const MAX_KEY_POSITION = 99;

/** Como era antes: as duas no fim, A pagar e depois Dividir, ativas. */
export const DEFAULT_PAYMENT_KEY_LAYOUT: PaymentKeyLayout = {
  openAccount: { position: 98, active: true },
  split: { position: 99, active: true },
};

function parseSpecialKey(raw: unknown, field: string): SpecialPaymentKey {
  const fields = parseObject(raw, `${field} ({ position, active })`);
  const position = parseNonNegativeInt(fields.position, `${field}.position`);
  if (position > MAX_KEY_POSITION)
    throw new BadRequestException(
      `Campo "${field}.position" inválido: recebido ${position}, esperado inteiro de 0 a ${MAX_KEY_POSITION}`,
    );
  return { position, active: parseBoolean(fields.active, `${field}.active`) };
}

/**
 * O lugar e o liga/desliga do A pagar e do Dividir; os dois não dividem a mesma posição.
 *
 * @example parsePaymentKeyLayout({ openAccount: { position: 4, active: true }, split: { position: 2, active: true } }).split.position // 2
 */
export function parsePaymentKeyLayout(raw: unknown): PaymentKeyLayout {
  const fields = parseObject(raw, 'teclas ({ openAccount, split })');
  const layout = {
    openAccount: parseSpecialKey(fields.openAccount, 'openAccount'),
    split: parseSpecialKey(fields.split, 'split'),
  };
  if (layout.openAccount.position === layout.split.position)
    throw new BadRequestException(
      `Campo "paymentKeyLayout" inválido: A pagar e Dividir na mesma posição ${layout.split.position}, esperado posições diferentes`,
    );
  return layout;
}

/**
 * O lugar gravado em JSON; estragado ou ausente vira o padrão (as teclas nunca somem por erro).
 *
 * @example readStoredPaymentKeyLayout(null).split.position // 99
 */
export function readStoredPaymentKeyLayout(
  stored: string | null,
): PaymentKeyLayout {
  if (stored === null) return DEFAULT_PAYMENT_KEY_LAYOUT;
  try {
    return parsePaymentKeyLayout(JSON.parse(stored));
  } catch {
    return DEFAULT_PAYMENT_KEY_LAYOUT;
  }
}
