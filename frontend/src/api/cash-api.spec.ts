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

  it('sem data escolhida usa as rotas de hoje, sem query', async () => {
    const api = new RecordingApiClient();
    const cash = createCashApi(api);
    await cash.closingToday();
    await cash.listOrders();
    expect(api.calls.map((call) => call.path)).toEqual([
      '/closings/today',
      '/orders/today',
    ]);
  });

  it('com data escolhida manda ?date= nas leituras e nas criações, mas não no PUT', async () => {
    const api = new RecordingApiClient();
    const cash = createCashApi(api, '2026-09-20');
    const input = {
      amount: '1.00',
      type: 'COUNTER' as const,
      paymentMethodId: 1,
    };
    await cash.closingToday();
    await cash.reportToday();
    await cash.closeToday();
    await cash.listExpenses();
    await cash.saveOrder(null, input);
    await cash.saveOrder(7, input);
    expect(api.calls.map((call) => `${call.method} ${call.path}`)).toEqual([
      'GET /closings/today?date=2026-09-20',
      'GET /closings/today/report?date=2026-09-20',
      'POST /closings/today/close?date=2026-09-20',
      'GET /expenses/today?date=2026-09-20',
      'POST /orders?date=2026-09-20',
      'PUT /orders/7',
    ]);
  });
});
