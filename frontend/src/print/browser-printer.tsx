import { flushSync } from 'react-dom';
import { createRoot } from 'react-dom/client';
import type { ReceiptModel } from './receipt-model';
import type { ReceiptPrinter } from './receipt-printer';
import { Ticket } from './Ticket';

const PRINT_ROOT_ID = 'print-root';

/** A área que só aparece na impressão (ver `styles/ticket.css`), criada na 1ª vez. */
function printRoot(): HTMLElement {
  const existing = document.getElementById(PRINT_ROOT_ID);
  if (existing) return existing;
  const created = document.createElement('div');
  created.id = PRINT_ROOT_ID;
  document.body.append(created);
  return created;
}

/**
 * Impressão pelo Chrome (caminho A, 2026-10-10): desenha a comanda na área de impressão e
 * chama `window.print()`. Com `--kiosk-printing`, sai direto na impressora padrão; o
 * `print()` do Chrome segura o script até mandar, então dá para limpar logo depois.
 *
 * @example createBrowserReceiptPrinter().print(fullReceipt(order, day))
 */
export function createBrowserReceiptPrinter(): ReceiptPrinter {
  return {
    print: (receipt: ReceiptModel) => {
      const root = createRoot(printRoot());
      flushSync(() => root.render(<Ticket receipt={receipt} />));
      window.print();
      root.unmount();
    },
  };
}
