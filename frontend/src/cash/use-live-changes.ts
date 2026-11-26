import { type MutableRefObject, useEffect, useRef, useState } from 'react';
import type { EventStreamOpener } from '../api/event-stream';
import { runLiveConnection } from './live-connection';
import { createPendingRefresh, LIVE_PENDING_CHECK_MS } from './pending-refresh';
import { isRefreshPaused } from './use-auto-refresh';

export interface UseLiveChangesOptions {
  enabled: boolean;
  open: EventStreamOpener;
  isPaused?: () => boolean;
}

interface StreamRunner {
  start(): void;
  stop(): void;
}

function createStreamRunner(
  open: () => EventStreamOpener,
  onEvent: (type: string, isReconnect: boolean) => void,
  onStatus: (connected: boolean) => void,
): StreamRunner {
  let controller: AbortController | null = null;
  return {
    start(): void {
      // Um stream por tela: dois "visible" seguidos não abrem uma 2ª conexão (limite de 6 no HTTP/1.1).
      if (controller || document.visibilityState === 'hidden') return;
      controller = new AbortController();
      void runLiveConnection(open(), { onEvent, onStatus }, controller.signal);
    },
    stop(): void {
      if (controller) {
        controller.abort();
        controller = null;
      }
      onStatus(false);
    },
  };
}

function handleLiveEvent(
  type: string,
  isReconnect: boolean,
  hasEverConnectedRef: MutableRefObject<boolean>,
  requestRefresh: () => void,
): void {
  if (type === 'changed') {
    requestRefresh();
    return;
  }
  if (type === 'ready') {
    if (isReconnect || hasEverConnectedRef.current) requestRefresh();
    hasEverConnectedRef.current = true;
  }
}

interface LiveSetupParams {
  enabled: boolean;
  open: () => EventStreamOpener;
  isPaused: () => boolean;
  refresh: () => void;
  setConnected: (status: boolean) => void;
  hasEverConnectedRef: MutableRefObject<boolean>;
}

function setupLiveStream(params: LiveSetupParams): () => void {
  const pending = createPendingRefresh(params.refresh, params.isPaused);
  const interval = setInterval(() => pending.flush(), LIVE_PENDING_CHECK_MS);
  const runner = createStreamRunner(
    params.open,
    (type, isRec) =>
      handleLiveEvent(type, isRec, params.hasEverConnectedRef, () =>
        pending.request(),
      ),
    params.setConnected,
  );
  const onVisibility = () => {
    if (document.visibilityState === 'hidden') runner.stop();
    else runner.start();
  };
  document.addEventListener('visibilitychange', onVisibility);
  runner.start();
  return () => {
    document.removeEventListener('visibilitychange', onVisibility);
    clearInterval(interval);
    pending.dispose();
    runner.stop();
  };
}

/**
 * Conecta ao stream SSE de eventos do caixa e recarrega quando há alterações.
 * Aba escondida fecha o stream e reconecta ao voltar.
 *
 * @example const live = useLiveChanges(() => reload(), { enabled: true, open });
 */
export function useLiveChanges(
  refresh: () => void,
  options: UseLiveChangesOptions,
): { connected: boolean } {
  const [connected, setConnected] = useState(false);
  const refreshRef = useRef(refresh);
  const isPausedRef = useRef(options.isPaused ?? isRefreshPaused);
  const openRef = useRef(options.open);
  const hasEverConnectedRef = useRef(false);

  useEffect(() => {
    refreshRef.current = refresh;
    isPausedRef.current = options.isPaused ?? isRefreshPaused;
    openRef.current = options.open;
  }, [refresh, options.isPaused, options.open]);

  useEffect(() => {
    if (!options.enabled) return;
    return setupLiveStream({
      enabled: options.enabled,
      open: () => openRef.current,
      isPaused: () => isPausedRef.current(),
      refresh: () => refreshRef.current(),
      setConnected,
      hasEverConnectedRef,
    });
  }, [options.enabled]);

  return { connected: options.enabled ? connected : false };
}
