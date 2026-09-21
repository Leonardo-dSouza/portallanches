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
});
