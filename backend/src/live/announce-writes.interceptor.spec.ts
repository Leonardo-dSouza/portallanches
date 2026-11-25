import { CallHandler, ExecutionContext } from '@nestjs/common';
import { lastValueFrom, of, throwError } from 'rxjs';
import { describe, expect, it } from 'vitest';
import {
  AnnounceWritesInterceptor,
  isAnnouncedWrite,
} from './announce-writes.interceptor.js';
import { DataChangeBus } from './data-change-bus.js';

class FakeHttpContext {
  constructor(
    private readonly method: string,
    private readonly url: string,
  ) {}

  switchToHttp() {
    return {
      getRequest: () => ({
        method: this.method,
        url: this.url,
      }),
      getResponse: () => ({}),
      getNext: () => ({}),
    };
  }

  getClass() {
    return class {};
  }

  getHandler() {
    return () => undefined;
  }

  getArgs() {
    return [];
  }

  getArgByIndex() {
    return undefined;
  }

  switchToRpc() {
    return {} as never;
  }

  switchToWs() {
    return {} as never;
  }

  getType() {
    return 'http' as const;
  }
}

class FakeCallHandler implements CallHandler<unknown> {
  constructor(private readonly source$: import('rxjs').Observable<unknown>) {}

  handle(): import('rxjs').Observable<unknown> {
    return this.source$;
  }
}

describe('isAnnouncedWrite', () => {
  it.each([
    ['POST', '/orders', true],
    ['PUT', '/orders/5?date=2026-11-24', true],
    ['DELETE', '/expenses/3', true],
    ['PATCH', '/orders/5/status', true],
    ['GET', '/orders', false],
    ['POST', '/auth/login', false],
    ['POST', '/auth/logout', false],
    ['POST', '/costs/preview', false],
    ['POST', '/expense-invoices/preview', false],
  ])('avalia %s %s como %s', (method, path, expected) => {
    expect(isAnnouncedWrite(method, path)).toBe(expected);
  });
});

describe('AnnounceWritesInterceptor', () => {
  it('avisa depois de um POST que deu certo', async () => {
    const bus = new DataChangeBus();
    const interceptor = new AnnounceWritesInterceptor(bus);
    let notices = 0;
    bus.changes().subscribe(() => {
      notices += 1;
    });

    const context = new FakeHttpContext(
      'POST',
      '/orders',
    ) as unknown as ExecutionContext;
    const next = new FakeCallHandler(of({ id: 1 }));

    await lastValueFrom(interceptor.intercept(context, next));

    expect(notices).toBe(1);
  });

  it('não avisa quando o handler falha', async () => {
    const bus = new DataChangeBus();
    const interceptor = new AnnounceWritesInterceptor(bus);
    let notices = 0;
    bus.changes().subscribe(() => {
      notices += 1;
    });

    const context = new FakeHttpContext(
      'POST',
      '/orders',
    ) as unknown as ExecutionContext;
    const next = new FakeCallHandler(
      throwError(() => new Error('falha na escrita')),
    );

    await expect(
      lastValueFrom(interceptor.intercept(context, next)),
    ).rejects.toThrow('falha na escrita');

    expect(notices).toBe(0);
  });

  it('não avisa num GET', async () => {
    const bus = new DataChangeBus();
    const interceptor = new AnnounceWritesInterceptor(bus);
    let notices = 0;
    bus.changes().subscribe(() => {
      notices += 1;
    });

    const context = new FakeHttpContext(
      'GET',
      '/orders',
    ) as unknown as ExecutionContext;
    const next = new FakeCallHandler(of({ items: [] }));

    await lastValueFrom(interceptor.intercept(context, next));

    expect(notices).toBe(0);
  });
});
