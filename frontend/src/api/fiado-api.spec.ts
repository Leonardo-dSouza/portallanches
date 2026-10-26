import type { ApiClient, HttpMethod } from './api-client';
import { fiadoCalls } from './fiado-api';

class RecordingApiClient implements ApiClient {
  readonly calls: { method: HttpMethod; path: string; body?: unknown }[] = [];

  async request<T>(method: HttpMethod, path: string, body?: unknown) {
    this.calls.push({ method, path, body });
    return undefined as T;
  }
}

describe('fiadoCalls', () => {
  it('lê quem deve, o extrato e os do dia (com a data escolhida)', async () => {
    const api = new RecordingApiClient();
    const fiado = fiadoCalls(api, '2026-10-25');
    await fiado.listFiadoDebtors();
    await fiado.fiadoStatement(12);
    await fiado.listFiadoDue();
    expect(api.calls.map((c) => `${c.method} ${c.path}`)).toEqual([
      'GET /fiado/open',
      'GET /fiado/customers/12',
      'GET /fiado/due?date=2026-10-25',
    ]);
  });

  it('sem data, os do dia são da noite em andamento', async () => {
    const api = new RecordingApiClient();
    await fiadoCalls(api, null).listFiadoDue();
    expect(api.calls[0].path).toBe('/fiado/due');
  });

  it('receber leva a noite escolhida; estornar e remarcar mandam o corpo', async () => {
    const api = new RecordingApiClient();
    const fiado = fiadoCalls(api, '2026-10-25');
    const input = { amount: '20.00', extra: '5.00', paymentMethodId: 1 };
    await fiado.receiveFiado(5, input);
    await fiado.cancelFiadoPayment(3, 'Lançou errado');
    await fiado.cancelFiadoPayment(4, 'Errado', 'senha');
    await fiado.rescheduleFiado(5, null);
    expect(api.calls).toEqual([
      {
        method: 'POST',
        path: '/fiado/orders/5/payments',
        body: { ...input, date: '2026-10-25' },
      },
      {
        method: 'POST',
        path: '/fiado/payments/3/cancel',
        body: { reason: 'Lançou errado' },
      },
      {
        method: 'POST',
        path: '/fiado/payments/4/cancel',
        body: { reason: 'Errado', managerPassword: 'senha' },
      },
      {
        method: 'PUT',
        path: '/fiado/orders/5/due-date',
        body: { dueDate: null },
      },
    ]);
  });

  it('receber sem data não manda o campo (a noite em andamento)', async () => {
    const api = new RecordingApiClient();
    const input = { amount: '20.00', paymentMethodId: 1 };
    await fiadoCalls(api, null).receiveFiado(5, input);
    expect(api.calls[0].body).toEqual(input);
  });
});
