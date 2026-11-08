import type { Order, SavedOrder } from '../api/types';
import { itemsChanged } from './added-items';
import type { ReceiptPrinter } from './receipt-printer';
import {
  addedReceipt,
  changedReceipt,
  fullReceipt,
  type ReceiptContext,
  type ReceiptModel,
} from './receipt-model';

/**
 * O que imprimir depois de salvar: só na noite em andamento; o pedido novo sai inteiro; a
 * edição que mexe nos itens sai inteira de novo com "ALTERADO" (2026-10-15, no lugar da
 * ADIÇÃO); o modo acrescentar usa o "ADIÇÃO" (2026-11-08); trocar só pagamento ou endereço
 * não imprime.
 *
 * @example receiptAfterSave(saved, null, day)?.kind // 'full'
 */
export function receiptAfterSave(
  saved: SavedOrder,
  before: Order | null,
  day: ReceiptContext,
  mode?: 'new' | 'edit' | 'add',
): ReceiptModel | null {
  if (!saved.live) return null;
  if (!before) return fullReceipt(saved, day);
  if (!itemsChanged(before.items, saved.items)) return null;
  if (mode === 'add') return addedReceipt(saved, before.items, day);
  return changedReceipt(saved, before.items, day);
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
    const which = receipt.number || `do consumo de ${receipt.name}`;
    return `A comanda ${which} não imprimiu (${reason}): use o Reimprimir.`;
  }
}
