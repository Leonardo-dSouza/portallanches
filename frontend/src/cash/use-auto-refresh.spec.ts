import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { isRefreshPaused, useAutoRefresh } from './use-auto-refresh';

describe('useAutoRefresh', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('chama o callback de atualização a cada 20 s', () => {
    const refresh = vi.fn();
    renderHook(() => useAutoRefresh(refresh, { enabled: true }));

    expect(refresh).not.toHaveBeenCalled();

    vi.advanceTimersByTime(20_000);
    expect(refresh).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(20_000);
    expect(refresh).toHaveBeenCalledTimes(2);
  });

  it('não chama quando enabled é false', () => {
    const refresh = vi.fn();
    renderHook(() => useAutoRefresh(refresh, { enabled: false }));

    vi.advanceTimersByTime(60_000);
    expect(refresh).not.toHaveBeenCalled();
  });

  it('não chama quando isPaused devolve true', () => {
    const refresh = vi.fn();
    renderHook(() =>
      useAutoRefresh(refresh, { enabled: true, isPaused: () => true }),
    );

    vi.advanceTimersByTime(40_000);
    expect(refresh).not.toHaveBeenCalled();
  });

  it('para de chamar ao desmontar o componente', () => {
    const refresh = vi.fn();
    const { unmount } = renderHook(() =>
      useAutoRefresh(refresh, { enabled: true }),
    );

    vi.advanceTimersByTime(20_000);
    expect(refresh).toHaveBeenCalledTimes(1);

    unmount();
    vi.advanceTimersByTime(40_000);
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('respeita intervalMs customizado', () => {
    const refresh = vi.fn();
    renderHook(() =>
      useAutoRefresh(refresh, { enabled: true, intervalMs: 5_000 }),
    );

    vi.advanceTimersByTime(5_000);
    expect(refresh).toHaveBeenCalledTimes(1);
  });
});

describe('isRefreshPaused', () => {
  it('devolve true quando a aba está oculta', () => {
    const doc = {
      visibilityState: 'hidden',
      querySelector: () => null,
    } as unknown as Document;

    expect(isRefreshPaused(doc)).toBe(true);
  });

  it('devolve true quando há um <dialog> com atributo open no documento', () => {
    const dialog = document.createElement('dialog');
    dialog.setAttribute('open', '');
    document.body.appendChild(dialog);
    try {
      expect(isRefreshPaused(document)).toBe(true);
    } finally {
      dialog.remove();
    }
  });

  it('devolve false quando a aba está visível e não há nenhum dialog aberto', () => {
    expect(document.visibilityState).toBe('visible');
    expect(isRefreshPaused(document)).toBe(false);
  });

  it('usa o document global por padrão se nenhum doc for passado', () => {
    expect(isRefreshPaused()).toBe(false);
  });
});
