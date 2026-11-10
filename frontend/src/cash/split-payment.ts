import {
  centsToMoney,
  formatMoney,
  moneyToCents,
  toApiMoney,
  typedMoney,
} from '../api/money';
import type {
  Money,
  Order,
  PaymentMethod,
  PaymentMode,
  PaymentPart,
  PaymentPartInput,
} from '../api/types';
import { describePayment, SPLIT } from './payment-choice';

// Pagamento dividido (card 2, 2026-11-08): o pedido pago em duas ou mais formas. O fiado não
// entra (fiado parcial é o pedido fiado + Receber), e o Dinheiro aparece numa parte só, porque
// é nela que fica o "Troco para" (decisões do usuário).

/** Rascunho de uma parte do pagamento dividido como digitado pelo caixa. */
export interface SplitPartDraft {
  paymentMethodId: string;
  paymentMode: PaymentMode | '';
  amount: string;
}

/** O que abrir e fechar o Dividir mexe, no pedido e no Receber do A pagar. */
export interface SplitChoiceFields {
  paymentMethodId: string;
  paymentMode: PaymentMode | '';
  splitParts: SplitPartDraft[];
}

/**
 * Diz se o pedido (ou o retrato dele no histórico) foi pago de forma dividida: só ele tem
 * partes, sempre 2 ou mais.
 *
 * @example isSplitOrder(order) // true
 */
export function isSplitOrder(
  order: { paymentParts?: readonly unknown[] } | null | undefined,
): boolean {
  return (order?.paymentParts?.length ?? 0) >= 2;
}

/**
 * Converte o texto digitado no valor de uma parte em centavos inteiros.
 *
 * @example partAmountToCents('20,50') // 2050
 */
export function partAmountToCents(amount: string): number {
  const api = toApiMoney(amount);
  return api !== null ? moneyToCents(api) : 0;
}

/**
 * Soma todas as partes do rascunho em centavos inteiros.
 *
 * @example partsTotalCents([{ paymentMethodId: '1', paymentMode: '', amount: '10,00' }]) // 1000
 */
export function partsTotalCents(parts: readonly SplitPartDraft[]): number {
  return parts.reduce((sum, part) => sum + partAmountToCents(part.amount), 0);
}

/**
 * Diferença entre o total do pedido e a soma das partes: positivo = falta, negativo = sobra.
 *
 * @example splitDifferenceCents(5000, [{ paymentMethodId: '1', paymentMode: '', amount: '20,00' }]) // 3000
 */
export function splitDifferenceCents(
  totalCents: number,
  parts: readonly SplitPartDraft[],
): number {
  return totalCents - partsTotalCents(parts);
}

function unbalancedText(diff: number): string | null {
  if (diff > 0) return `Falta ${formatMoney(centsToMoney(diff))}`;
  if (diff < 0) return `Sobra ${formatMoney(centsToMoney(-diff))}`;
  return null;
}

/**
 * Rótulo de conferência do que falta ou sobra para fechar o total do pedido.
 *
 * @example splitDifferenceLabel(5000, [{ paymentMethodId: '1', paymentMode: '', amount: '20,00' }]) // 'Falta R$ 30,00'
 * @example splitDifferenceLabel(5000, [{ paymentMethodId: '1', paymentMode: '', amount: '50,00' }]) // 'Fechou'
 */
export function splitDifferenceLabel(
  totalCents: number,
  parts: readonly SplitPartDraft[],
): string {
  const diff = splitDifferenceCents(totalCents, parts);
  // "Fechou" no zero (2026-11-10): o "Falta R$ 0,00" parecia que ainda faltava algo.
  return unbalancedText(diff) ?? 'Fechou';
}

/**
 * Adiciona uma nova linha com o que falta já preenchido para o caixa escolher a forma.
 *
 * @example appendRemainingPart([{ paymentMethodId: '1', paymentMode: '', amount: '20,00' }], 5000)
 */
export function appendRemainingPart(
  parts: readonly SplitPartDraft[],
  totalCents: number,
): SplitPartDraft[] {
  const remaining = Math.max(0, totalCents - partsTotalCents(parts));
  return [
    ...parts,
    {
      paymentMethodId: '',
      paymentMode: '',
      amount: typedMoney(centsToMoney(remaining)),
    },
  ];
}

/**
 * Abre o Dividir: a forma que estava escolhida vira a 1ª linha (o caixa só digita o valor).
 *
 * @example openSplitChoice({ paymentMethodId: '1', paymentMode: '', splitParts: [] }).splitParts[0].paymentMethodId // '1'
 */
export function openSplitChoice<T extends SplitChoiceFields>(current: T): T {
  const chosen = current.paymentMethodId !== SPLIT ? current : null;
  const first: SplitPartDraft = {
    paymentMethodId: chosen?.paymentMethodId ?? '',
    paymentMode: chosen?.paymentMode ?? '',
    amount: '',
  };
  return {
    ...current,
    paymentMethodId: SPLIT,
    paymentMode: '',
    splitParts: [first],
  };
}

/**
 * Esc no Dividir: volta para uma forma só, sem nenhuma escolhida.
 *
 * @example closeSplitChoice(values).paymentMethodId // ''
 */
export function closeSplitChoice<T extends SplitChoiceFields>(current: T): T {
  return { ...current, paymentMethodId: '', paymentMode: '', splitParts: [] };
}

/**
 * Tirar uma de duas partes (2026-11-10): não fica um Dividir de uma parte só; volta para a forma
 * única com a forma e o meio da parte que ficou.
 *
 * @example collapseSplitChoice(values, { paymentMethodId: '3', paymentMode: 'DEBIT', amount: '40,00' }).paymentMethodId // '3'
 */
export function collapseSplitChoice<T extends SplitChoiceFields>(
  current: T,
  kept: SplitPartDraft,
): T {
  return {
    ...current,
    paymentMethodId: kept.paymentMethodId,
    paymentMode: kept.paymentMode,
    splitParts: [],
  };
}

/** A forma da parte (ou da parte gravada) entre as do caixa; undefined se sumiu. */
export const splitPartMethod = (
  part: { paymentMethodId: string | number },
  methods: PaymentMethod[],
): PaymentMethod | undefined =>
  methods.find((m) => String(m.id) === String(part.paymentMethodId));

function checkMinimumParts(parts: readonly SplitPartDraft[]): string | null {
  if (parts.length < 2)
    return 'O pagamento dividido precisa de 2 partes ou mais';
  return null;
}

function checkMissingMethods(parts: readonly SplitPartDraft[]): string | null {
  const missing = parts.findIndex((part) => !part.paymentMethodId);
  return missing < 0 ? null : `Escolha a forma da parte ${missing + 1}`;
}

function checkFiado(
  parts: readonly SplitPartDraft[],
  methods: PaymentMethod[],
): string | null {
  const hasFiado = parts.some((p) => splitPartMethod(p, methods)?.isFiado);
  return hasFiado
    ? 'Fiado não divide: lance o pedido como fiado e receba a parte paga'
    : null;
}

function checkMissingModes(
  parts: readonly SplitPartDraft[],
  methods: PaymentMethod[],
): string | null {
  const missing = parts.find(
    (part) =>
      splitPartMethod(part, methods)?.isCardTerminal && !part.paymentMode,
  );
  if (!missing) return null;
  const name = splitPartMethod(missing, methods)?.name ?? '';
  return `Escolha crédito, débito ou PIX na ${name} (teclas 1 a 3)`;
}

function checkDuplicateCash(
  parts: readonly SplitPartDraft[],
  methods: PaymentMethod[],
): string | null {
  const cashCount = parts.filter(
    (p) => splitPartMethod(p, methods)?.isCash,
  ).length;
  return cashCount > 1
    ? 'O Dinheiro entra numa parte só (some os valores)'
    : null;
}

function checkPositiveAmounts(parts: readonly SplitPartDraft[]): string | null {
  const empty = parts.findIndex((p) => partAmountToCents(p.amount) <= 0);
  return empty < 0 ? null : `Digite o valor da parte ${empty + 1}`;
}

function checkChangeFor(
  parts: readonly SplitPartDraft[],
  methods: PaymentMethod[],
  changeFor: string,
): string | null {
  if (!changeFor.trim()) return null;
  const changeMoney = toApiMoney(changeFor);
  if (changeMoney === null)
    return `Troco inválido "${changeFor}": digite só números (ex.: 50,00)`;
  const cashPart = parts.find((p) => splitPartMethod(p, methods)?.isCash);
  if (!cashPart) return '"Troco para" só vale com uma parte em Dinheiro';
  const cashCents = partAmountToCents(cashPart.amount);
  if (moneyToCents(changeMoney) >= cashCents) return null;
  return `Troco para ${formatMoney(changeMoney)} é menor que a parte em dinheiro (${formatMoney(centsToMoney(cashCents))})`;
}

/**
 * Primeiro problema que impede o envio do pagamento dividido, ou null quando válido.
 *
 * @example firstSplitProblem([{ paymentMethodId: '1', paymentMode: '', amount: '20,00' }], 5000, methods, '')
 */
export function firstSplitProblem(
  parts: readonly SplitPartDraft[],
  totalCents: number,
  methods: PaymentMethod[],
  changeFor: string,
): string | null {
  return (
    checkMinimumParts(parts) ??
    checkMissingMethods(parts) ??
    checkFiado(parts, methods) ??
    checkMissingModes(parts, methods) ??
    checkDuplicateCash(parts, methods) ??
    checkPositiveAmounts(parts) ??
    unbalancedText(splitDifferenceCents(totalCents, parts)) ??
    checkChangeFor(parts, methods, changeFor)
  );
}

/**
 * Converte as partes digitadas pelo caixa para o contrato da API (já conferidas por
 * `firstSplitProblem`, então todo valor é válido).
 *
 * @example toApiPaymentParts([{ paymentMethodId: '1', paymentMode: '', amount: '20,00' }])
 */
export function toApiPaymentParts(
  parts: readonly SplitPartDraft[],
): PaymentPartInput[] {
  return parts.map((part) => ({
    paymentMethodId: Number(part.paymentMethodId),
    ...(part.paymentMode && { paymentMode: part.paymentMode }),
    amount: toApiMoney(part.amount) ?? '0.00',
  }));
}

/**
 * Converte as partes da API para o formato de edição com vírgula decimal.
 *
 * @example toSplitPartDrafts([{ paymentMethodId: 1, paymentMode: null, amount: '20.00' }])
 */
export function toSplitPartDrafts(
  parts: readonly PaymentPart[],
): SplitPartDraft[] {
  return parts.map((part) => ({
    paymentMethodId: String(part.paymentMethodId),
    paymentMode: part.paymentMode ?? '',
    amount: typedMoney(part.amount),
  }));
}

/**
 * Soma o acréscimo do + Item na parte de mesma forma e meio, ou cria nova parte no fim.
 *
 * @example addOnParts([{ paymentMethodId: 1, paymentMode: null, amount: '20.00' }], 1, null, 1500)
 */
export function addOnParts(
  parts: readonly PaymentPart[],
  methodId: number,
  mode: PaymentMode | null,
  addedCents: number,
): PaymentPart[] {
  const index = parts.findIndex(
    (p) => p.paymentMethodId === methodId && p.paymentMode === mode,
  );
  if (index < 0)
    return [
      ...parts,
      {
        paymentMethodId: methodId,
        paymentMode: mode,
        amount: centsToMoney(addedCents),
      },
    ];
  const grown = moneyToCents(parts[index].amount) + addedCents;
  return parts.with(index, { ...parts[index], amount: centsToMoney(grown) });
}

/**
 * Uma parte como a tela, a comanda e o histórico mostram.
 *
 * @example describePaymentPart({ paymentMethodId: 7, paymentMode: 'DEBIT', amount: '30.00' }, methods) // 'Cartão Ton · Débito R$ 30,00'
 */
export function describePaymentPart(
  part: PaymentPart,
  methods: PaymentMethod[],
): string {
  const method = splitPartMethod(part, methods);
  return `${describePayment(method, part.paymentMode)} ${formatMoney(part.amount)}`;
}

/**
 * Quanto o Dinheiro cobre no pedido: a parte em dinheiro no dividido, o total nos outros. É
 * sobre ele que o motoboy leva o troco.
 *
 * @example cashAmountOf(pix10MaisDinheiro28, methods) // '28.20'
 */
export function cashAmountOf(
  order: Pick<Order, 'amount' | 'paymentParts'>,
  methods: PaymentMethod[],
): Money {
  if (!isSplitOrder(order)) return order.amount;
  const cash = order.paymentParts.find(
    (p) => splitPartMethod(p, methods)?.isCash,
  );
  return cash?.amount ?? order.amount;
}

/**
 * "(levar R$ X)" ao lado do troco enquanto o caixa digita; null sem troco ou com troco menor.
 *
 * @example carryHintOf('100,00', '28,20') // '(levar R$ 71,80)'
 */
export function carryHintOf(
  changeFor: string,
  cashAmount: string,
): string | null {
  const change = toApiMoney(changeFor);
  const cash = toApiMoney(cashAmount);
  if (!change || !cash) return null;
  const carry = moneyToCents(change) - moneyToCents(cash);
  return carry < 0 ? null : `(levar ${formatMoney(centsToMoney(carry))})`;
}

/**
 * A nota embaixo das formas no relatório e na Análise; null sem nenhum dividido.
 *
 * @example splitOrdersNote(2) // '2 pedidos divididos'
 */
export function splitOrdersNote(count: number): string | null {
  if (count <= 0) return null;
  return count === 1 ? '1 pedido dividido' : `${count} pedidos divididos`;
}
