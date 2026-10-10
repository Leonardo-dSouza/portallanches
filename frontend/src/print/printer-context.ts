import { createContext, useContext } from 'react';
import { NO_PRINTER, type ReceiptPrinter } from './receipt-printer';

/** A impressora da comanda, injetada no `main.tsx` (e um fake nos testes). */
export const PrinterContext = createContext<ReceiptPrinter>(NO_PRINTER);

/** @example const printer = usePrinter(); printer.print(fullReceipt(order, day)); */
export function usePrinter(): ReceiptPrinter {
  return useContext(PrinterContext);
}
