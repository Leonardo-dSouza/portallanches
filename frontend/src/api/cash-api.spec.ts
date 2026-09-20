import type { ApiClient, HttpMethod } from './api-client';
import { createCashApi } from './cash-api';

class RecordingApiClient implements ApiClient {
  readonly calls: { method: HttpMethod; path: string; body?: unknown }[] = [];

  async request<T>(method: HttpMethod, path: string, body?: unknown) {
    this.calls.push({ method, path, body });
    return undefined as T;
  }
}

describe('createCashApi', () => {
  it('saveOrder sem id cria (POST) e com id substitui (PUT)', async () => {
    const api = new RecordingApiClient();
    const cash = createCashApi(api);
    const input = {
      amount: '30.00',
      type: 'COUNTER' as const,
      paymentMethodId: 1,
    };
    await cash.saveOrder(null, input);
    await cash.saveOrder(7, input);
    expect(api.calls).toEqual([
      { method: 'POST', path: '/orders', body: input },
      { method: 'PUT', path: '/orders/7', body: input },
    ]);
  });

  it('cria bairro com nome e taxa e apaga gasto por id', async () => {
    const api = new RecordingApiClient();
    const cash = createCashApi(api);
    await cash.createDeliveryZone('Dunamis', '8.00');
    await cash.deleteExpense(3);
    expect(api.calls).toEqual([
      {
        method: 'POST',
        path: '/delivery-zones',
        body: { neighborhood: 'Dunamis', fee: '8.00' },
      },
      { method: 'DELETE', path: '/expenses/3', body: undefined },
    ]);
  });
});
