import type { ReceiptModel } from '../print/receipt-model';
import type { ReceiptPrinter } from '../print/receipt-printer';

/** Impressora dos testes: guarda as comandas "impressas" em vez de chamar o navegador. */
export class FakeReceiptPrinter implements ReceiptPrinter {
  readonly printed: ReceiptModel[] = [];

  print(receipt: ReceiptModel): void {
    this.printed.push(receipt);
  }
}
