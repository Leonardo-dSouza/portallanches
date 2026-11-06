import { ChevronRight } from 'lucide-react';
import { centsToMoney, formatMoney } from '../api/money';
import type { DraftLine } from './order-lines';
import { previewTotalCents } from './order-lines';

interface ComandaBarProps {
  /** Linhas atuais da comanda (principais, sem adicionais). */
  lines: DraftLine[];
  /** Callback para abrir a tela FECHAR. */
  onOpenClose(): void;
}

/** Soma as quantidades de todas as linhas principais (sem adicionais). */
function totalItems(lines: DraftLine[]): number {
  return lines.reduce((sum, line) => sum + line.quantity, 0);
}

/**
 * Barra fixa acima da navegação do celular (2026-11-05): mostra a quantidade de itens e o
 * total do pedido, com seta para abrir a tela de fechamento. Só aparece na tela MONTAR.
 */
export function ComandaBar({ lines, onOpenClose }: ComandaBarProps) {
  const count = totalItems(lines);
  const totalCents = previewTotalCents(lines, '');
  const totalText = formatMoney(centsToMoney(totalCents));
  const itemLabel = count === 1 ? '1 item' : `${count} itens`;

  return (
    <button
      type="button"
      className="comanda-bar"
      onClick={onOpenClose}
      aria-label={`Comanda: ${itemLabel} · ${totalText}. Abrir fechamento.`}
    >
      <span className="comanda-bar-summary">
        <span className="comanda-bar-count">Comanda ({itemLabel})</span>
        <span className="comanda-bar-total">· {totalText}</span>
      </span>
      <ChevronRight aria-hidden className="comanda-bar-arrow" />
    </button>
  );
}
