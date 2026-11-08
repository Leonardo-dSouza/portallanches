import type { Prisma } from '../generated/prisma/client.js';
import type { PaymentMode } from './order-input.js';
import { isSplitPayment, type PaymentPart } from './payment-parts.js';

/**
 * As partes do pagamento dividido na ordem em que o caixa digitou (card 2, 2026-11-08): o
 * `include` de toda leitura de pedido (lista, relatório, período e Análise).
 */
export const PAYMENT_PARTS_IN_ORDER = {
  orderBy: { position: 'asc' },
} as const satisfies Prisma.OrderPaymentPartFindManyArgs;

/** A linha da tabela como o Prisma dá: o valor é `Decimal`. */
interface PaymentPartRow {
  paymentMethodId: number;
  paymentMode: PaymentMode | null;
  amount: Prisma.Decimal;
}

/**
 * Uma parte gravada no formato da API (valor com 2 casas).
 *
 * @example toPaymentPart({ paymentMethodId: 1, paymentMode: null, amount: new Decimal(20) }).amount // '20.00'
 */
export function toPaymentPart(row: PaymentPartRow): PaymentPart {
  return {
    paymentMethodId: row.paymentMethodId,
    paymentMode: row.paymentMode,
    amount: row.amount.toFixed(2),
  };
}

/**
 * Troca as partes do pedido na mesma transação dele: apaga as que havia e grava as novas só no
 * dividido (uma forma, A pagar e fiado ficam sem linha nenhuma).
 *
 * @example await replacePaymentParts(tx, 7, [pix, dinheiro])
 */
export async function replacePaymentParts(
  tx: Prisma.TransactionClient,
  orderId: number,
  parts: PaymentPart[],
): Promise<void> {
  await tx.orderPaymentPart.deleteMany({ where: { orderId } });
  if (!isSplitPayment({ paymentParts: parts })) return;
  await tx.orderPaymentPart.createMany({
    data: parts.map((part, position) => ({ orderId, ...part, position })),
  });
}
