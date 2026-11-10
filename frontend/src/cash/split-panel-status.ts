import type { PaymentMethod } from '../api/types';
import {
  partAmountToCents,
  splitDifferenceCents,
  splitPartMethod,
  type SplitPartDraft,
} from './split-payment';

// O que o painel Dividir mostra enquanto o caixa digita (2026-11-10, pedido do dono: o erro só
// aparecia ao salvar). O salvar continua conferindo tudo em `firstSplitProblem`.

/** Cor do selo do topo: falta (mostarda), sobra (vermelho) ou fechou (verde). */
export type SplitBalanceTone = 'short' | 'over' | 'ok';

/**
 * Se as partes ainda não somam o total, passam dele ou fecham certinho.
 *
 * @example splitBalanceTone(5000, [{ paymentMethodId: '1', paymentMode: '', amount: '20,00' }]) // 'short'
 */
export function splitBalanceTone(
  totalCents: number,
  parts: readonly SplitPartDraft[],
): SplitBalanceTone {
  const diff = splitDifferenceCents(totalCents, parts);
  if (diff > 0) return 'short';
  return diff < 0 ? 'over' : 'ok';
}

function cashRepeated(
  parts: readonly SplitPartDraft[],
  index: number,
  methods: PaymentMethod[],
): boolean {
  const isCash = (p: SplitPartDraft) => splitPartMethod(p, methods)?.isCash;
  return isCash(parts[index]) === true && parts.slice(0, index).some(isCash);
}

function partProblem(
  parts: readonly SplitPartDraft[],
  index: number,
  methods: PaymentMethod[],
): string | null {
  const part = parts[index];
  const method = splitPartMethod(part, methods);
  if (!method) return 'Escolha a forma';
  if (method.isCardTerminal && !part.paymentMode)
    return `Escolha crédito, débito ou PIX na ${method.name}`;
  if (partAmountToCents(part.amount) <= 0) return 'Valor zerado';
  if (cashRepeated(parts, index, methods))
    return 'O Dinheiro já está noutra parte: some os valores';
  return null;
}

/**
 * O problema de cada linha do Dividir (ou null), para o aviso embaixo dela.
 *
 * @example splitPartProblems([{ paymentMethodId: '', paymentMode: '', amount: '20,00' }], methods) // ['Escolha a forma']
 */
export function splitPartProblems(
  parts: readonly SplitPartDraft[],
  methods: PaymentMethod[],
): Array<string | null> {
  return parts.map((_, index) => partProblem(parts, index, methods));
}
