import type { ReceiptModel } from './receipt-model';

/** Quem imprime a comanda: o navegador (Chrome do caixa) ou um fake nos testes. */
export interface ReceiptPrinter {
  print(receipt: ReceiptModel): void;
}

/** Sem impressora (telas fora do caixa): não faz nada. */
export const NO_PRINTER: ReceiptPrinter = { print: () => undefined };
