import type { EventStreamOpener, SseEvent } from '../api/event-stream';

export const LIVE_RETRY_DELAYS_MS = [1_000, 2_000, 5_000, 10_000, 15_000];

export interface LiveHandlers {
  onEvent(type: string, isReconnect: boolean): void;
  onStatus(connected: boolean): void;
}

interface ConnectionLoopState {
  attemptIndex: number;
  isReconnect: boolean;
}

function isAuthError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const status = (err as { status?: unknown }).status;
  return status === 401 || status === 403;
}

function sleepWithAbort(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    if (signal.aborted) {
      resolve();
      return;
    }
    const timer = setTimeout(resolve, ms);
    signal.addEventListener(
      'abort',
      () => {
        clearTimeout(timer);
        resolve();
      },
      { once: true },
    );
  });
}

function computeRetryDelay(attemptIndex: number): number {
  const index = Math.min(attemptIndex, LIVE_RETRY_DELAYS_MS.length - 1);
  return LIVE_RETRY_DELAYS_MS[index];
}

function handleIncomingEvent(
  event: SseEvent,
  state: ConnectionLoopState,
  handlers: LiveHandlers,
): void {
  if (event.type === 'ready') {
    state.attemptIndex = 0;
    handlers.onStatus(true);
    handlers.onEvent(event.type, state.isReconnect);
    state.isReconnect = true;
    return;
  }
  handlers.onEvent(event.type, state.isReconnect);
}

async function runConnectionAttempt(
  open: EventStreamOpener,
  handlers: LiveHandlers,
  signal: AbortSignal,
  state: ConnectionLoopState,
): Promise<boolean> {
  try {
    await open(
      '/live/events',
      (event) => handleIncomingEvent(event, state, handlers),
      signal,
    );
    return false;
  } catch (err) {
    if (isAuthError(err)) return true;
    return false;
  } finally {
    handlers.onStatus(false);
  }
}

/**
 * Mantém o stream aberto: reconecta com as esperas de LIVE_RETRY_DELAYS_MS; para no abort ou em 401/403.
 *
 * @example await runLiveConnection(open, handlers, abortController.signal);
 */
export async function runLiveConnection(
  open: EventStreamOpener,
  handlers: LiveHandlers,
  signal: AbortSignal,
  wait: (ms: number, signal: AbortSignal) => Promise<void> = sleepWithAbort,
): Promise<void> {
  const state: ConnectionLoopState = { attemptIndex: 0, isReconnect: false };

  while (!signal.aborted) {
    const isTerminalAuth = await runConnectionAttempt(
      open,
      handlers,
      signal,
      state,
    );
    if (isTerminalAuth || signal.aborted) break;

    const delay = computeRetryDelay(state.attemptIndex);
    state.attemptIndex++;
    state.isReconnect = true;
    await wait(delay, signal);
  }
}
