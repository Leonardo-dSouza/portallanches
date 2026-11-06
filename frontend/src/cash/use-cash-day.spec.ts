import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { HttpMethod } from '../api/api-client';
import { createCashApi } from '../api/cash-api';
import type { Order } from '../api/types';
import { FakeApiClient } from '../test-support/fake-api-client';
import { orderFixture } from '../test-support/order-fixture';
import { useCashDay } from './use-cash-day';

interface Deferred<T> {
  promise: Promise<T>;
  resolve(value: T): void;
  reject(error: Error): void;
}

function createDeferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

class DeferredOrdersApiClient extends FakeApiClient {
  readonly deferredOrders: Deferred<Order[]>[] = [];

  override async request<T>(
    method: HttpMethod,
    path: string,
    body?: unknown,
  ): Promise<T> {
    if (method === 'GET' && path === '/orders/today') {
      const deferred = createDeferred<Order[]>();
      this.deferredOrders.push(deferred);
      return deferred.promise as Promise<T>;
    }
    return super.request(method, path, body);
  }
}

describe('useCashDay', () => {
  it('carrega os dados do dia ao montar', async () => {
    const client = new DeferredOrdersApiClient();
    const cash = createCashApi(client);
    const { result } = renderHook(() => useCashDay(cash));

    expect(result.current.day).toBeNull();
    const order = orderFixture({ id: 10, dayNumber: 1 });

    await act(async () => {
      client.deferredOrders[0].resolve([order]);
    });

    expect(result.current.day?.orders).toEqual([order]);
    expect(result.current.error).toBeNull();
  });

  it('ignora resposta de reload mais lenta que chega depois da chamada mais recente', async () => {
    const client = new DeferredOrdersApiClient();
    const cash = createCashApi(client);
    const { result } = renderHook(() => useCashDay(cash));

    // Carga inicial (requisição 0)
    await act(async () => {
      client.deferredOrders[0].resolve([]);
    });
    expect(result.current.day?.orders).toEqual([]);

    // Dispara reload 1 (lento) e reload 2 (rápido)
    let reload1Promise!: Promise<void>;
    let reload2Promise!: Promise<void>;
    act(() => {
      reload1Promise = result.current.reload();
      reload2Promise = result.current.reload();
    });

    expect(client.deferredOrders).toHaveLength(3);

    const slowOrder = orderFixture({ id: 1, dayNumber: 1 });
    const fastOrder = orderFixture({ id: 2, dayNumber: 2 });

    // A resposta mais recente (índice 2) chega primeiro
    await act(async () => {
      client.deferredOrders[2].resolve([fastOrder]);
      await reload2Promise;
    });
    expect(result.current.day?.orders).toEqual([fastOrder]);

    // A resposta anterior (índice 1) chega atrasada e deve ser ignorada
    await act(async () => {
      client.deferredOrders[1].resolve([slowOrder]);
      await reload1Promise;
    });
    expect(result.current.day?.orders).toEqual([fastOrder]);
  });

  it('ignora erro de chamada anterior que falha depois de chamada recente ter tido sucesso', async () => {
    const client = new DeferredOrdersApiClient();
    const cash = createCashApi(client);
    const { result } = renderHook(() => useCashDay(cash));

    await act(async () => {
      client.deferredOrders[0].resolve([]);
    });

    let reload1Promise!: Promise<void>;
    let reload2Promise!: Promise<void>;
    act(() => {
      reload1Promise = result.current.reload();
      reload2Promise = result.current.reload();
    });

    const recentOrder = orderFixture({ id: 99, dayNumber: 99 });

    // Chamada mais recente tem sucesso
    await act(async () => {
      client.deferredOrders[2].resolve([recentOrder]);
      await reload2Promise;
    });
    expect(result.current.error).toBeNull();
    expect(result.current.day?.orders).toEqual([recentOrder]);

    // Chamada anterior falha depois
    await act(async () => {
      client.deferredOrders[1].reject(new Error('Falha de rede antiga'));
      await reload1Promise;
    });
    expect(result.current.error).toBeNull();
    expect(result.current.day?.orders).toEqual([recentOrder]);
  });
});
