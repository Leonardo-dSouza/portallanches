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
      items: [{ productId: 9, quantity: 2 }],
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

  it('cria bairro com nome e taxa e cancela/restaura gasto por id', async () => {
    const api = new RecordingApiClient();
    const cash = createCashApi(api);
    await cash.createDeliveryZone('Dunamis', '8.00');
    await cash.cancelExpense(3);
    await cash.restoreExpense(3);
    await cash.listExpenseEvents(3);
    expect(api.calls).toEqual([
      {
        method: 'POST',
        path: '/delivery-zones',
        body: { neighborhood: 'Dunamis', fee: '8.00' },
      },
      { method: 'POST', path: '/expenses/3/cancel', body: undefined },
      { method: 'POST', path: '/expenses/3/restore', body: undefined },
      { method: 'GET', path: '/expenses/3/events', body: undefined },
    ]);
  });

  it('sem data escolhida usa as rotas de hoje, sem query', async () => {
    const api = new RecordingApiClient();
    const cash = createCashApi(api);
    await cash.openDrawer('30.00');
    await cash.closingToday();
    await cash.listOrders();
    await cash.listMenu();
    expect(api.calls).toEqual([
      {
        method: 'PUT',
        path: '/closings/today/opening',
        body: { amount: '30.00' },
      },
      { method: 'GET', path: '/closings/today', body: undefined },
      { method: 'GET', path: '/orders/today', body: undefined },
      { method: 'GET', path: '/products/for-sale', body: undefined },
    ]);
  });

  it('com data escolhida manda ?date= no openDrawer, nas leituras e criações', async () => {
    const api = new RecordingApiClient();
    const cash = createCashApi(api, '2026-09-20');
    await cash.openDrawer('40.00');
    expect(api.calls).toEqual([
      {
        method: 'PUT',
        path: '/closings/today/opening?date=2026-09-20',
        body: { amount: '40.00' },
      },
    ]);
  });

  it('com data escolhida manda ?date= nas leituras e nas criações, mas não no PUT', async () => {
    const api = new RecordingApiClient();
    const cash = createCashApi(api, '2026-09-20');
    const input = {
      items: [{ productId: 9, quantity: 1 }],
      type: 'COUNTER' as const,
      paymentMethodId: 1,
    };
    await cash.closingToday();
    await cash.reportToday();
    await cash.closeToday();
    await cash.listExpenses();
    await cash.listMenu();
    await cash.saveOrder(null, input);
    await cash.saveOrder(7, input);
    expect(api.calls.map((call) => `${call.method} ${call.path}`)).toEqual([
      'GET /closings/today?date=2026-09-20',
      'GET /closings/today/report?date=2026-09-20',
      'POST /closings/today/close?date=2026-09-20',
      'GET /expenses/today?date=2026-09-20',
      // Cardápio com o preço daquele dia (caixa atrasado depois do reajuste).
      'GET /products/for-sale?date=2026-09-20',
      'POST /orders?date=2026-09-20',
      'PUT /orders/7',
    ]);
  });

  it('closeToday envia o corpo da contagem quando informado', async () => {
    const api = new RecordingApiClient();
    const cash = createCashApi(api);
    const count = {
      counts: [{ paymentMethodId: 1, amount: '35.00' }],
      note: 'troco extra',
    };
    await cash.closeToday(count);
    expect(api.calls).toEqual([
      {
        method: 'POST',
        path: '/closings/today/close',
        body: count,
      },
    ]);
  });
});
