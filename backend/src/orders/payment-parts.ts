import {
  BadRequestException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { parseChoice, parseId, parseObject } from '../common/input-parsers.js';
import { formatCents, parseMoney, toCents } from '../common/money.js';
import type { PaymentMode } from './order-input.js';
import { assertChangeFor, resolvePaymentMethod } from './order-payment.js';
import type { OrderCatalog, PaymentMethodEntry } from './order-repository.js';

const PAYMENT_MODES: readonly PaymentMode[] = ['CREDIT', 'DEBIT', 'PIX'];

const isAbsent = (value: unknown): boolean =>
  value === undefined || value === null;

/**
 * Parte de um pagamento dividido entre duas ou mais formas (card 2, 2026-11-08).
 * `amount` é sempre texto com 2 casas decimais (ex.: '20.00').
 */
export interface PaymentPart {
  paymentMethodId: number;
  paymentMode: PaymentMode | null;
  amount: string;
}

/**
 * O pedido (ou o corpo, ou a linha do relatório) é dividido: só ele tem partes gravadas, e
 * sempre 2 ou mais. Pedido de uma forma, A pagar, fiado e os antigos não têm nenhuma.
 *
 * @example isSplitPayment({ paymentParts: [pix, dinheiro] }) // true
 */
export function isSplitPayment(side: {
  paymentParts?: readonly unknown[];
}): boolean {
  return (side.paymentParts?.length ?? 0) >= 2;
}

/**
 * Valida o formato de uma parte individual do pagamento.
 *
 * @example parsePaymentPart({ paymentMethodId: 1, amount: '20.00' })
 */
export function parsePaymentPart(raw: unknown): PaymentPart {
  const fields = parseObject(raw, 'parte do pagamento');
  return {
    paymentMethodId: parseId(fields.paymentMethodId, 'paymentMethodId'),
    paymentMode: isAbsent(fields.paymentMode)
      ? null
      : parseChoice(fields.paymentMode, 'paymentMode', PAYMENT_MODES),
    amount: parseMoney(fields.amount, 'amount', false),
  };
}

/**
 * Valida o formato da lista de partes: pelo menos 2 partes e cada valor maior que zero.
 *
 * @example parsePaymentParts([{ paymentMethodId: 1, amount: '20.00' }, { paymentMethodId: 2, amount: '30.00' }])
 */
export function parsePaymentParts(raw: unknown): PaymentPart[] {
  if (!Array.isArray(raw) || raw.length < 2) {
    const received = Array.isArray(raw) ? raw.length : JSON.stringify(raw);
    throw new BadRequestException(
      `Pagamento dividido precisa de pelo menos 2 partes: recebido ${received}, esperado lista com 2 ou mais partes`,
    );
  }
  return raw.map(parsePaymentPart);
}

/** A forma do corpo quando ele vem dividido: a 1ª parte vira a forma do pedido. */
export interface SplitChoice {
  paymentMethodId: number;
  paymentMode: PaymentMode | null;
  paymentParts: PaymentPart[];
}

/**
 * Lê `paymentParts` do corpo (pedido ou Receber do A pagar); null quando o corpo não divide.
 * Com partes, a forma única não pode vir junto (seria ambíguo qual vale). A 1ª parte vira a
 * forma do pedido, para o A pagar, o fiado e a trava do Fechar seguirem iguais.
 *
 * @example parseSplitChoice({ paymentParts: [pix, dinheiro] }, 'Pedido')?.paymentMethodId // 1
 */
export function parseSplitChoice(
  fields: Record<string, unknown>,
  what: string,
): SplitChoice | null {
  if (isAbsent(fields.paymentParts)) return null;
  if (!isAbsent(fields.paymentMethodId) || !isAbsent(fields.paymentMode))
    throw new BadRequestException(
      `${what} com "paymentParts" não aceita "paymentMethodId" nem "paymentMode" (recebido ${JSON.stringify(fields.paymentMethodId)} e ${JSON.stringify(fields.paymentMode)}): esperado usar apenas as partes`,
    );
  const paymentParts = parsePaymentParts(fields.paymentParts);
  const [first] = paymentParts;
  return {
    paymentMethodId: first.paymentMethodId,
    paymentMode: first.paymentMode,
    paymentParts,
  };
}

/**
 * Confere se a soma das partes em centavos bate com o total do pedido.
 *
 * @example assertPartsSum(parts, '50.00')
 */
export function assertPartsSum(
  parts: PaymentPart[],
  orderAmount: string,
): void {
  const partsSumCents = parts.reduce((sum, p) => sum + toCents(p.amount), 0);
  const orderCents = toCents(orderAmount);
  if (partsSumCents === orderCents) return;
  const partsSum = formatCents(partsSumCents);
  throw new UnprocessableEntityException(
    `Partes somam ${partsSum}, total do pedido ${orderAmount}: esperado que as partes somem exatamente o total do pedido`,
  );
}

function assertNotFiado(method: PaymentMethodEntry): void {
  if (!method.isFiado) return;
  throw new UnprocessableEntityException(
    `Forma de pagamento ${method.id} é fiado: esperado forma de pagamento imediata (fiado não pode ser parte de pagamento dividido)`,
  );
}

/** Uma parte com a forma do cadastro já conferida (ativa e com o meio certo). */
interface ResolvedPart {
  part: PaymentPart;
  method: PaymentMethodEntry;
}

async function resolvePart(
  catalog: OrderCatalog,
  part: PaymentPart,
): Promise<ResolvedPart> {
  // A parte sempre tem forma (o parser exige o id), então o null de "A pagar" não acontece.
  const method = await resolvePaymentMethod(catalog, part);
  if (!method)
    throw new BadRequestException(
      `Parte do pagamento sem forma: recebido ${JSON.stringify(part)}, esperado "paymentMethodId"`,
    );
  assertNotFiado(method);
  return { part, method };
}

/** O dinheiro fica numa parte só: é nela que mora o "Troco para" (decisão do usuário). */
function cashPartOf(resolved: ResolvedPart[]): ResolvedPart | null {
  const cash = resolved.filter((r) => r.method.isCash);
  if (cash.length <= 1) return cash[0] ?? null;
  throw new UnprocessableEntityException(
    `Pagamento dividido tem ${cash.length} partes em dinheiro: esperado no máximo uma parte em dinheiro`,
  );
}

/**
 * Valida as regras de negócio das partes: soma, formas ativas/meio, sem fiado,
 * no máximo uma em dinheiro e troco coerente com a parte em dinheiro.
 *
 * @example await resolvePaymentParts(catalog, parts, '50.00', '50.00')
 */
export async function resolvePaymentParts(
  catalog: OrderCatalog,
  parts: PaymentPart[],
  orderAmount: string,
  changeFor: string | null,
): Promise<void> {
  if (parts.length === 0) return;
  assertPartsSum(parts, orderAmount);
  const resolved: ResolvedPart[] = [];
  for (const part of parts) resolved.push(await resolvePart(catalog, part));
  const cash = cashPartOf(resolved);
  if (!cash) return assertChangeFor(changeFor, resolved[0].method, orderAmount);
  assertChangeFor(
    changeFor,
    cash.method,
    cash.part.amount,
    'a parte em dinheiro',
  );
}

/** O que o pagamento do pedido traz: as partes (vazio = uma forma) e o "Troco para". */
type PaymentCoverage = {
  paymentParts: PaymentPart[];
  changeFor: string | null;
};

/**
 * O pagamento cobre o pedido: no dividido, as regras das partes; numa forma só, o troco contra o
 * total (como sempre foi). Vale no lançamento, no Editar e no Receber do A pagar.
 *
 * @example await assertPaymentCovers(catalog, { paymentParts: [], changeFor: '50.00' }, dinheiro, '38.60')
 */
export async function assertPaymentCovers(
  catalog: OrderCatalog,
  payment: PaymentCoverage,
  method: PaymentMethodEntry | null,
  amount: string,
): Promise<void> {
  if (!isSplitPayment(payment))
    return assertChangeFor(payment.changeFor, method, amount);
  await resolvePaymentParts(
    catalog,
    payment.paymentParts,
    amount,
    payment.changeFor,
  );
}
