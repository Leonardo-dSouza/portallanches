import type { Order } from '../api/types';
import { usePrinter } from '../print/printer-context';
import { fullReceipt } from '../print/receipt-model';
import { useTicketSettings } from '../print/ticket-settings';
import type { CashDay } from './use-cash-day';

/**
 * Reimprimir a comanda: sempre sai (papel acabou, pedido editado), mesmo com o "ao salvar"
 * desligado. A lista do caixa e a janela do pedido na aba Fiado (2026-10-27) usam.
 *
 * @example const reprint = useReprint(day); reprint(order);
 */
export function useReprint(day: CashDay): (order: Order) => void {
  const printer = usePrinter();
  const ticket = useTicketSettings();
  return (order) => printer.print(fullReceipt(order, { ...day, ticket }));
}
