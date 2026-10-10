import type { Order, SavedOrder } from '../api/types';
import { addedItems } from './added-items';
import type { ReceiptPrinter } from './receipt-printer';
import {
  additionReceipt,
  fullReceipt,
  type ReceiptContext,
  type ReceiptModel,
} from './receipt-model';

/**
 * O que imprimir depois de salvar (decisões de 2026-10-10): só na noite em andamento; o
 * pedido novo sai inteiro; a edição sai como ADIÇÃO se acrescentou itens; o resto, nada.
 *
 * @example receiptAfterSave(saved, null, day)?.kind // 'full'
 */
export function receiptAfterSave(
  saved: SavedOrder,
  editing: Order | null,
  day: ReceiptContext,
): ReceiptModel | null {
  if (!saved.live) return null;
  if (!editing) return fullReceipt(saved, day);
  const added = addedItems(editing.items, saved.items);
  return added.length > 0 ? additionReceipt(saved, added) : null;
}

/**
 * Imprime sem nunca derrubar o salvamento (o pedido já foi gravado): um erro da impressão
 * vira aviso para o caixa usar o Reimprimir.
 *
 * @example printSafely(printer, receipt) // null quando imprimiu
 */
export function printSafely(
  printer: ReceiptPrinter,
  receipt: ReceiptModel,
): string | null {
  try {
    printer.print(receipt);
    return null;
  } catch (failure) {
    const reason = failure instanceof Error ? failure.message : String(failure);
    return `A comanda ${receipt.number} não imprimiu (${reason}): use o Reimprimir.`;
  }
}
