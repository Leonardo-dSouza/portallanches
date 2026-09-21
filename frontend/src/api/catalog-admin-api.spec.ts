import type { ApiClient, HttpMethod } from './api-client';
import { createCatalogAdminApi } from './catalog-admin-api';

class RecordingApiClient implements ApiClient {
  readonly calls: { method: HttpMethod; path: string; body?: unknown }[] = [];

  async request<T>(method: HttpMethod, path: string, body?: unknown) {
    this.calls.push({ method, path, body });
    return undefined as T;
  }
}

describe('createCatalogAdminApi', () => {
  it('atualiza bairro e tipo de gasto com PUT por id', async () => {
    const api = new RecordingApiClient();
    const admin = createCatalogAdminApi(api);
    const zone = { neighborhood: 'Uru', fee: '1.50', active: false };
    await admin.updateDeliveryZone(6, zone);
    await admin.updateExpenseType(4, { name: 'Embalagens', active: false });
    expect(api.calls).toEqual([
      { method: 'PUT', path: '/delivery-zones/6', body: zone },
      {
        method: 'PUT',
        path: '/expense-types/4',
        body: { name: 'Embalagens', active: false },
      },
    ]);
  });

  it('pagamentos: cria com POST e atualiza com PUT por id', async () => {
    const api = new RecordingApiClient();
    const admin = createCatalogAdminApi(api);
    const input = { name: 'Vale', active: true, sortOrder: 4 };
    await admin.createPaymentMethod(input);
    await admin.updatePaymentMethod(3, { ...input, active: false });
    expect(api.calls).toEqual([
      { method: 'POST', path: '/payment-methods', body: input },
      {
        method: 'PUT',
        path: '/payment-methods/3',
        body: { ...input, active: false },
      },
    ]);
  });

  it('diária: lista e grava por POST (o backend corrige grupo+data repetidos)', async () => {
    const api = new RecordingApiClient();
    const admin = createCatalogAdminApi(api);
    const rate = {
      dayGroup: 'FRI_SUN' as const,
      amount: '60.00',
      effectiveFrom: '2026-10-01',
    };
    await admin.listMotoboyRates();
    await admin.saveMotoboyRate(rate);
    expect(api.calls).toEqual([
      { method: 'GET', path: '/motoboy-rates', body: undefined },
      { method: 'POST', path: '/motoboy-rates', body: rate },
    ]);
  });
});
