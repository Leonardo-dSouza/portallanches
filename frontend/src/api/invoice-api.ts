import type { ApiClient } from './api-client';
import type { ExpenseInvoiceDetail, InvoicePreview } from './invoice-types';

/** Nota fiscal dos gastos: ler na SEFAZ antes de salvar e abrir a de um gasto salvo. */
export interface InvoiceApi {
  /** `expenseId` é o gasto em edição: a nota dele não conta como repetida. */
  preview(code: string, expenseId: number | null): Promise<InvoicePreview>;
  detail(id: number): Promise<ExpenseInvoiceDetail>;
}

/** @example await createInvoiceApi(api).preview('https://…/qrcode?p=3526…', null) */
export function createInvoiceApi(api: ApiClient): InvoiceApi {
  return {
    preview: (code, expenseId) =>
      api.request('POST', '/expense-invoices/preview', {
        code,
        ...(expenseId === null ? {} : { expenseId }),
      }),
    detail: (id) => api.request('GET', `/expense-invoices/${id}`),
  };
}
