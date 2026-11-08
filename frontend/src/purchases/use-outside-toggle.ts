import { useState } from 'react';
import type { InvoiceItem } from '../api/invoice-types';
import { centsToMoney, moneyToCents } from '../api/money';
import type { Money } from '../api/types';
import {
  outsideMarksOf,
  toggledPositions,
  type OutsideMarks,
} from './outside-items';

/** Marcar os itens fora da lanchonete (2026-10-25): no Caixa, com o gasto, e em Compras. */
export interface OutsideMarking {
  /** Posições de fora agora; null = as gravadas na nota (antes de mexer). */
  positions: number[] | null;
  /** Desconto da lanchonete agora; null = o da nota (antes de mexer). */
  businessDiscount?: string | null;
  onChange(marks: OutsideMarks): void;
  onProblemChange?(problem: string | null): void;
}

export interface OutsideToggle {
  problem: string | null;
  /** undefined = nota só para ler (sem a caixinha). `group`: as linhas da nota daquela linha. */
  onToggle?(group: number[]): void;
}

const WHOLE_INVOICE_OUTSIDE =
  'A nota inteira não pode ficar fora da lanchonete: tire a nota do gasto ou deixe um item.';

/**
 * Mantém o desconto digitado enquanto ele estiver na faixa das novas marcas (2026-11-08);
 * sem marcas, volta ao desconto total; fora da faixa, ajusta para o limite.
 */
function effectiveDiscountFor(
  items: InvoiceItem[],
  next: number[],
  discount: Money,
  businessDiscount: Money,
): Money {
  if (next.length === 0) return discount;
  const chosen = new Set(next);
  const nextGrossCents = items
    .filter((item) => chosen.has(item.position))
    .reduce((sum, item) => sum + moneyToCents(item.total), 0);
  const discountCents = moneyToCents(discount);
  const minCents = Math.max(0, discountCents - nextGrossCents);
  const currentCents = moneyToCents(businessDiscount);
  if (currentCents < minCents) return centsToMoney(minCents);
  if (currentCents > discountCents) return discount;
  return businessDiscount;
}

/**
 * A caixinha de cada item: troca a marca e avisa quem marca. A nota inteira de fora não é gasto
 * da lanchonete (a API também recusa): fica o aviso e a marca não muda.
 *
 * @example const toggle = useOutsideToggle(invoice.items, [9], marking);
 */
export function useOutsideToggle(
  items: InvoiceItem[],
  positions: number[],
  marking: OutsideMarking | undefined,
  discount: Money = '0.00',
  businessDiscount: Money = discount,
  amountDue: Money = '0.00',
): OutsideToggle {
  const [problem, setProblem] = useState<string | null>(null);
  if (!marking) return { problem: null };
  const onToggle = (group: number[]) => {
    const next = toggledPositions(positions, group);
    if (next.length >= items.length) return setProblem(WHOLE_INVOICE_OUTSIDE);
    setProblem(null);
    const effectiveDiscount = effectiveDiscountFor(
      items,
      next,
      discount,
      businessDiscount,
    );
    marking.onChange(
      outsideMarksOf({
        items,
        positions: next,
        discount,
        businessDiscount: effectiveDiscount,
        amountDue,
      }),
    );
  };
  return { problem, onToggle };
}
