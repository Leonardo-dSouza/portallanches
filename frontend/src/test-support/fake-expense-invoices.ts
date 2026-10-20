import { ApiError, type HttpMethod } from '../api/api-client';
import type {
  ExpenseInvoiceDetail,
  ExpenseInvoiceSummary,
  InvoicePreview,
} from '../api/invoice-types';
import type { Expense } from '../api/types';

/** O que o fake guarda dos gastos e das notas (implementado pelo `FakeApiClient`). */
export interface FakeExpenseStore {
  expenses: Expense[];
  /** O que a "SEFAZ" devolve para cada código digitado; um `ApiError` é a recusa (409, 503…). */
  invoicePreviews: Record<string, InvoicePreview | ApiError>;
  invoiceDetails: Record<number, ExpenseInvoiceDetail>;
  takeId(): number;
}

/** Prévia do código, como o backend: código desconhecido é 400 com o valor recebido. */
export function fakeInvoicePreview(
  store: FakeExpenseStore,
  code: string,
): InvoicePreview {
  const preview = store.invoicePreviews[code];
  if (preview instanceof ApiError) throw preview;
  if (!preview)
    throw new ApiError(
      400,
      `Nota fiscal inválida: recebido ${JSON.stringify(code)}, esperado o link do QR Code ou a chave de 44 números`,
    );
  return preview;
}

/**
 * Nota do gasto ao salvar, como o backend: código ausente mantém a nota, null tira e texto
 * lê de novo (a mesma recusa da prévia).
 */
export function fakeSavedInvoice(
  store: FakeExpenseStore,
  code: unknown,
  previous: Expense | undefined,
): ExpenseInvoiceSummary | null {
  if (code === undefined) return previous?.invoice ?? null;
  if (code === null) return null;
  const { invoice, vendorName } = fakeInvoicePreview(store, String(code));
  return {
    id: store.takeId(),
    vendorName,
    issuedAt: invoice.issuedAt,
    itemCount: invoice.items.length,
    amountDue: invoice.amountDue,
  };
}

/** `POST /expense-invoices/preview` e `GET /expense-invoices/:id` do fake. */
export function fakeExpenseInvoiceRoute(
  store: FakeExpenseStore,
  method: HttpMethod,
  path: string,
  body: Record<string, unknown>,
): unknown {
  if (method === 'POST' && path === '/expense-invoices/preview')
    return fakeInvoicePreview(store, String(body.code));
  const id = Number(path.split('/')[2]);
  const detail = store.invoiceDetails[id];
  if (!detail) throw new ApiError(404, `Nota fiscal ${id} não encontrada`);
  return detail;
}
