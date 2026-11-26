import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../api/api-client';
import type { EventStreamOpener, SseEvent } from '../api/event-stream';
import { type LiveHandlers, runLiveConnection } from './live-connection';

class ScriptedLiveStream {
  readonly paths: string[] = [];
  readonly signals: AbortSignal[] = [];
  openCallCount = 0;
  private currentHandler: ((event: SseEvent) => void) | null = null;
  private currentResolver: (() => void) | null = null;
  private currentRejecter: ((err: unknown) => void) | null = null;

  readonly open: EventStreamOpener = async (path, onEvent, signal) => {
    this.paths.push(path);
    this.signals.push(signal);
    this.openCallCount++;
    this.currentHandler = onEvent;
    return new Promise<void>((resolve, reject) => {
      this.currentResolver = resolve;
      this.currentRejecter = reject;
      signal.addEventListener('abort', () => resolve(), { once: true });
    });
  };

  emit(type: string, data = '{}'): void {
    this.currentHandler?.({ type, data });
  }

  dropServerClose(): void {
    this.currentResolver?.();
  }

  dropError(error: unknown): void {
    this.currentRejecter?.(error);
  }
}

describe('runLiveConnection', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('reconecta depois da queda com 1 s e depois 2 s', async () => {
    const fake = new ScriptedLiveStream();
    const delays: number[] = [];
    const wait = async (ms: number) => {
      delays.push(ms);
    };
    const controller = new AbortController();
    const handlers: LiveHandlers = {
      onEvent: () => {},
      onStatus: () => {},
    };

    const connectionPromise = runLiveConnection(
      fake.open,
      handlers,
      controller.signal,
      wait,
    );

    // Conexão inicial cai
    fake.dropServerClose();
    await vi.advanceTimersByTimeAsync(0);
    expect(delays).toEqual([1_000]);

    // Segunda tentativa cai
    fake.dropServerClose();
    await vi.advanceTimersByTimeAsync(0);
    expect(delays).toEqual([1_000, 2_000]);

    controller.abort();
    fake.dropServerClose();
    await connectionPromise;
  });

  it('volta à 1ª espera depois de conectar de novo', async () => {
    const fake = new ScriptedLiveStream();
    const delays: number[] = [];
    const wait = async (ms: number) => {
      delays.push(ms);
    };
    const controller = new AbortController();
    const handlers: LiveHandlers = {
      onEvent: () => {},
      onStatus: () => {},
    };

    const connectionPromise = runLiveConnection(
      fake.open,
      handlers,
      controller.signal,
      wait,
    );

    // Queda 1: espera 1s
    fake.dropServerClose();
    await vi.advanceTimersByTimeAsync(0);
    expect(delays).toEqual([1_000]);

    // Reconecta com sucesso (ready zera o índice)
    fake.emit('ready');
    // Queda 2: deve voltar para 1s (primeiro delay)
    fake.dropServerClose();
    await vi.advanceTimersByTimeAsync(0);
    expect(delays).toEqual([1_000, 1_000]);

    controller.abort();
    fake.dropServerClose();
    await connectionPromise;
  });

  it('para de tentar no 401', async () => {
    const fake = new ScriptedLiveStream();
    let waitCalled = false;
    const wait = async () => {
      waitCalled = true;
    };
    const controller = new AbortController();
    const statuses: boolean[] = [];
    const handlers: LiveHandlers = {
      onEvent: () => {},
      onStatus: (connected) => statuses.push(connected),
    };

    const connectionPromise = runLiveConnection(
      fake.open,
      handlers,
      controller.signal,
      wait,
    );

    fake.dropError(new ApiError(401, 'Não autenticado'));
    await connectionPromise;

    expect(waitCalled).toBe(false);
    expect(statuses).toEqual([false]);
  });

  it('para no abort', async () => {
    const fake = new ScriptedLiveStream();
    const controller = new AbortController();
    const handlers: LiveHandlers = {
      onEvent: () => {},
      onStatus: () => {},
    };

    const connectionPromise = runLiveConnection(
      fake.open,
      handlers,
      controller.signal,
    );

    controller.abort();
    fake.dropServerClose();
    await connectionPromise;
  });

  it('marca o ready da reconexão como isReconnect', async () => {
    const fake = new ScriptedLiveStream();
    const events: { type: string; isReconnect: boolean }[] = [];
    const wait = async () => {};
    const controller = new AbortController();
    const handlers: LiveHandlers = {
      onEvent: (type, isReconnect) => events.push({ type, isReconnect }),
      onStatus: () => {},
    };

    const connectionPromise = runLiveConnection(
      fake.open,
      handlers,
      controller.signal,
      wait,
    );

    // 1ª conexão
    fake.emit('ready');
    expect(events).toEqual([{ type: 'ready', isReconnect: false }]);

    // Cai e reconecta
    fake.dropServerClose();
    await vi.advanceTimersByTimeAsync(0);
    fake.emit('ready');

    expect(events).toEqual([
      { type: 'ready', isReconnect: false },
      { type: 'ready', isReconnect: true },
    ]);

    controller.abort();
    fake.dropServerClose();
    await connectionPromise;
  });
});
