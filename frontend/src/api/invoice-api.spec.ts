import type { ApiClient, HttpMethod } from './api-client';
import { createInvoiceApi } from './invoice-api';

class RecordingApiClient implements ApiClient {
  readonly calls: { method: HttpMethod; path: string; body?: unknown }[] = [];

  async request<T>(method: HttpMethod, path: string, body?: unknown) {
    this.calls.push({ method, path, body });
    return undefined as T;
  }
}

describe('createInvoiceApi', () => {
  it('a prévia manda o código e, na edição, o gasto (a nota dele não é repetida)', async () => {
    const api = new RecordingApiClient();
    const invoices = createInvoiceApi(api);
    await invoices.preview('3526…', null);
    await invoices.preview('3526…', 7);
    expect(api.calls).toEqual([
      {
        method: 'POST',
        path: '/expense-invoices/preview',
        body: { code: '3526…' },
      },
      {
        method: 'POST',
        path: '/expense-invoices/preview',
        body: { code: '3526…', expenseId: 7 },
      },
    ]);
  });

  it('a prévia do HTML salvo manda o arquivo no lugar do código', async () => {
    const api = new RecordingApiClient();
    const invoices = createInvoiceApi(api);
    await invoices.previewPage('<html>', null);
    await invoices.previewPage('<html>', 7);
    expect(api.calls.map((call) => call.body)).toEqual([
      { savedPage: '<html>' },
      { savedPage: '<html>', expenseId: 7 },
    ]);
  });

  it('o detalhe busca a nota pelo id', async () => {
    const api = new RecordingApiClient();
    await createInvoiceApi(api).detail(101);
    expect(api.calls).toEqual([
      { method: 'GET', path: '/expense-invoices/101', body: undefined },
    ]);
  });
});
