import { UnprocessableEntityException } from '@nestjs/common';
import { toMilli } from '../common/quantity.js';

/** O que o estorno precisa saber do lote, lido dentro da transação. */
export interface ReversalCandidate {
  lotId: number;
  supplyName: string;
  quantity: string;
  remaining: string;
  reversedAt: Date | null;
  /** Movimentos do lote além da própria entrada (contagem, venda, estorno). */
  laterMovements: number;
  /** Só entrada vira estorno; sobra achada na contagem se corrige contando de novo. */
  isEntry: boolean;
}

/**
 * Estorno só vale para entrada intacta: nada saiu nem foi ajustado depois. Fora isso, o
 * saldo já mudou por outro caminho e o certo é corrigir pela contagem.
 *
 * @example assertReversible({ lotId: 4, supplyName: 'Coca', quantity: '12', remaining: '12', reversedAt: null, laterMovements: 0, isEntry: true })
 */
export function assertReversible(lot: ReversalCandidate): void {
  const problem = reversalProblem(lot);
  if (problem === null) return;
  throw new UnprocessableEntityException(
    `Entrada ${lot.lotId} (${lot.supplyName}) não pode ser desfeita: ${problem}`,
  );
}

/** Para o histórico mostrar "Desfazer" só onde ele vai funcionar. */
export function isReversible(lot: ReversalCandidate): boolean {
  return reversalProblem(lot) === null;
}

function reversalProblem(lot: ReversalCandidate): string | null {
  if (!lot.isEntry)
    return 'é sobra de contagem, esperado um lote lançado como entrada';
  if (lot.reversedAt !== null) return 'já foi desfeita';
  const intact =
    lot.laterMovements === 0 &&
    toMilli(lot.remaining) === toMilli(lot.quantity);
  if (intact) return null;
  return `o saldo mudou depois dela (${lot.remaining} de ${lot.quantity}); corrija pela contagem`;
}
