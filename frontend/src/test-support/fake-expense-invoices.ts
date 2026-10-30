import { ApiError, type HttpMethod } from '../api/api-client';
import type {
  ExpenseInvoiceDetail,
  ExpenseInvoiceSummary,
  InvoiceItem,
  InvoicePreview,
} from '../api/invoice-types';
import { centsToMoney } from '../api/money';
import type { Expense } from '../api/types';
import { outsideMarksOf } from '../purchases/outside-items';

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

/** A contagem e a soma dos itens de fora, como o resumo do backend. */
function outsideSummary(items: InvoiceItem[], positions: number[]) {
  const marks = outsideMarksOf(items, positions);
  return {
    outsideItemCount: positions.length,
    outsideTotal: centsToMoney(marks.cents),
  };
}

/** A nota mantida: com marcas novas, o resumo as conta (pelos itens do detalhe guardado). */
function keptInvoice(
  store: FakeExpenseStore,
  previous: Expense | undefined,
  outsidePositions: number[] | undefined,
): ExpenseInvoiceSummary | null {
  const kept = previous?.invoice ?? null;
  if (!kept || !outsidePositions) return kept;
  const items = store.invoiceDetails[kept.id]?.items ?? [];
  return { ...kept, ...outsideSummary(items, outsidePositions) };
}

/**
 * Nota do gasto ao salvar, como o backend: código ausente mantém a nota, null tira e texto
 * lê de novo (a mesma recusa da prévia); `outsidePositions` marca os itens de fora.
 */
export function fakeSavedInvoice(
  store: FakeExpenseStore,
  code: unknown,
  previous: Expense | undefined,
  outsidePositions?: number[],
): ExpenseInvoiceSummary | null {
  if (code === undefined) return keptInvoice(store, previous, outsidePositions);
  if (code === null) return null;
  const { invoice, vendorName } = fakeInvoicePreview(store, String(code));
  return {
    id: store.takeId(),
    vendorName,
    issuedAt: invoice.issuedAt,
    itemCount: invoice.items.length,
    ...outsideSummary(invoice.items, outsidePositions ?? []),
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
    return fakeInvoicePreview(store, String(body.code ?? body.savedPage));
  const id = Number(path.split('/')[2]);
  const detail = store.invoiceDetails[id];
  if (!detail) throw new ApiError(404, `Nota fiscal ${id} não encontrada`);
  return detail;
}
