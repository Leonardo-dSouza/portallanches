import type { ApiClient, HttpMethod } from './api-client';
import { createPurchaseApi } from './purchase-api';

class RecordingApiClient implements ApiClient {
  readonly calls: { method: HttpMethod; path: string; body?: unknown }[] = [];

  async request<T>(method: HttpMethod, path: string, body?: unknown) {
    this.calls.push({ method, path, body });
    return undefined as T;
  }
}

const OCTOBER = { from: '2026-10-01', to: '2026-10-31' };

describe('createPurchaseApi', () => {
  it('notas, preços e mercados pedem o período', async () => {
    const api = new RecordingApiClient();
    const purchases = createPurchaseApi(api);
    await purchases.invoices(OCTOBER);
    await purchases.products(OCTOBER);
    await purchases.vendors(OCTOBER);
    expect(api.calls.map((c) => c.path)).toEqual([
      '/purchases/invoices?from=2026-10-01&to=2026-10-31',
      '/purchases/products?from=2026-10-01&to=2026-10-31',
      '/purchases/vendors?from=2026-10-01&to=2026-10-31',
    ]);
  });

  it('o histórico codifica o código do produto', async () => {
    const api = new RecordingApiClient();
    await createPurchaseApi(api).productHistory(
      { vendorId: 3, code: 'A&B 1' },
      OCTOBER,
    );
    expect(api.calls[0].path).toBe(
      '/purchases/products/history?vendorId=3&code=A%26B+1&from=2026-10-01&to=2026-10-31',
    );
  });

  it('o apelido vai no corpo do PUT do mercado', async () => {
    const api = new RecordingApiClient();
    await createPurchaseApi(api).renameVendor(5, 'Assaí');
    expect(api.calls).toEqual([
      { method: 'PUT', path: '/purchases/vendors/5', body: { nickname: 'Assaí' } },
    ]);
  });
});
