import { useState } from 'react';
import type { InvoiceItem } from '../api/invoice-types';
import {
  outsideMarksOf,
  toggledPositions,
  type OutsideMarks,
} from './outside-items';

/** Marcar os itens fora da lanchonete (2026-10-25): no Caixa, com o gasto, e em Compras. */
export interface OutsideMarking {
  /** Posições de fora agora; null = as gravadas na nota (antes de mexer). */
  positions: number[] | null;
  onChange(marks: OutsideMarks): void;
}

export interface OutsideToggle {
  problem: string | null;
  /** undefined = nota só para ler (sem a caixinha). */
  onToggle?(position: number): void;
}

const WHOLE_INVOICE_OUTSIDE =
  'A nota inteira não pode ficar fora da lanchonete: tire a nota do gasto ou deixe um item.';

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
): OutsideToggle {
  const [problem, setProblem] = useState<string | null>(null);
  if (!marking) return { problem: null };
  const onToggle = (position: number) => {
    const next = toggledPositions(positions, position);
    if (next.length >= items.length) return setProblem(WHOLE_INVOICE_OUTSIDE);
    setProblem(null);
    marking.onChange(outsideMarksOf(items, next));
  };
  return { problem, onToggle };
}
