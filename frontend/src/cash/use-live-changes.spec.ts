import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { EventStreamOpener, SseEvent } from '../api/event-stream';
import { LIVE_DEBOUNCE_MS, LIVE_PENDING_CHECK_MS } from './pending-refresh';
import { useLiveChanges } from './use-live-changes';

class ScriptedLiveStream {
  readonly paths: string[] = [];
  readonly openedSignals: AbortSignal[] = [];
  openCalls = 0;
  private currentHandler: ((event: SseEvent) => void) | null = null;
  private currentResolver: (() => void) | null = null;
  private currentRejecter: ((err: unknown) => void) | null = null;

  readonly open: EventStreamOpener = async (path, onEvent, signal) => {
    this.paths.push(path);
    this.openedSignals.push(signal);
    this.openCalls++;
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

describe('useLiveChanges', () => {
  let visibilityState: DocumentVisibilityState = 'visible';

  beforeEach(() => {
    vi.useFakeTimers();
    visibilityState = 'visible';
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => visibilityState,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    visibilityState = 'visible';
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      value: 'visible',
      writable: true,
    });
  });

  function setVisibility(state: DocumentVisibilityState) {
    visibilityState = state;
    document.dispatchEvent(new Event('visibilitychange'));
  }

  it('recarrega no changed', () => {
    const fake = new ScriptedLiveStream();
    const refresh = vi.fn();
    const { result } = renderHook(() =>
      useLiveChanges(refresh, {
        enabled: true,
        open: fake.open,
        isPaused: () => false,
      }),
    );

    act(() => {
      fake.emit('ready');
    });
    expect(result.current.connected).toBe(true);

    act(() => {
      fake.emit('changed');
      vi.advanceTimersByTime(LIVE_DEBOUNCE_MS);
    });

    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('não recarrega no ready da 1ª conexão e recarrega no ready depois da queda', async () => {
    const fake = new ScriptedLiveStream();
    const refresh = vi.fn();
    const { result } = renderHook(() =>
      useLiveChanges(refresh, {
        enabled: true,
        open: fake.open,
        isPaused: () => false,
      }),
    );

    // 1ª conexão
    act(() => {
      fake.emit('ready');
      vi.advanceTimersByTime(LIVE_DEBOUNCE_MS);
    });
    expect(result.current.connected).toBe(true);
    expect(refresh).not.toHaveBeenCalled();

    // Queda da conexão
    await act(async () => {
      fake.dropServerClose();
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(result.current.connected).toBe(false);

    // Reconecta e manda ready
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_000);
      fake.emit('ready');
      vi.advanceTimersByTime(LIVE_DEBOUNCE_MS);
    });

    expect(result.current.connected).toBe(true);
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('com o modal aberto espera o modal fechar', () => {
    const fake = new ScriptedLiveStream();
    const refresh = vi.fn();
    let modalOpen = true;

    renderHook(() =>
      useLiveChanges(refresh, {
        enabled: true,
        open: fake.open,
        isPaused: () => modalOpen,
      }),
    );

    act(() => {
      fake.emit('ready');
      fake.emit('changed');
      vi.advanceTimersByTime(LIVE_DEBOUNCE_MS);
    });
    expect(refresh).not.toHaveBeenCalled();

    // Modal fecha e intervalo de checagem solta a recarga
    act(() => {
      modalOpen = false;
      vi.advanceTimersByTime(LIVE_PENDING_CHECK_MS);
    });
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('fecha o stream quando a aba fica escondida', () => {
    const fake = new ScriptedLiveStream();
    const refresh = vi.fn();

    const { result } = renderHook(() =>
      useLiveChanges(refresh, {
        enabled: true,
        open: fake.open,
        isPaused: () => false,
      }),
    );

    act(() => {
      fake.emit('ready');
    });
    expect(result.current.connected).toBe(true);
    expect(fake.openedSignals[0].aborted).toBe(false);

    // Esconde a aba
    act(() => {
      setVisibility('hidden');
    });

    expect(fake.openedSignals[0].aborted).toBe(true);
    expect(result.current.connected).toBe(false);
  });

  it('reconecta e recarrega quando a aba volta a ficar visível', async () => {
    const fake = new ScriptedLiveStream();
    const refresh = vi.fn();

    renderHook(() =>
      useLiveChanges(refresh, {
        enabled: true,
        open: fake.open,
        isPaused: () => false,
      }),
    );

    act(() => {
      fake.emit('ready');
      vi.advanceTimersByTime(LIVE_DEBOUNCE_MS);
    });
    expect(refresh).not.toHaveBeenCalled();

    // Esconde a aba
    act(() => {
      setVisibility('hidden');
    });

    // Volta a ficar visível
    act(() => {
      setVisibility('visible');
    });

    // Novo stream recebe ready da reconexão
    act(() => {
      fake.emit('ready');
      vi.advanceTimersByTime(LIVE_DEBOUNCE_MS);
    });

    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('desligado não abre o stream', () => {
    const fake = new ScriptedLiveStream();
    const refresh = vi.fn();

    const { result } = renderHook(() =>
      useLiveChanges(refresh, {
        enabled: false,
        open: fake.open,
        isPaused: () => false,
      }),
    );

    expect(fake.openCalls).toBe(0);
    expect(result.current.connected).toBe(false);
  });
});
