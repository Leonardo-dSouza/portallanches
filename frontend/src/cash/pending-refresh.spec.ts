import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createPendingRefresh, LIVE_DEBOUNCE_MS } from './pending-refresh';

describe('createPendingRefresh', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('junta 3 avisos em 300 ms numa recarga só', () => {
    const refresh = vi.fn();
    const pending = createPendingRefresh(refresh, () => false);

    pending.request();
    vi.advanceTimersByTime(100);
    pending.request();
    vi.advanceTimersByTime(100);
    pending.request();

    expect(refresh).not.toHaveBeenCalled();

    vi.advanceTimersByTime(LIVE_DEBOUNCE_MS);
    expect(refresh).toHaveBeenCalledTimes(1);

    pending.dispose();
  });

  it('não recarrega na pausa e recarrega no flush quando a pausa acaba', () => {
    const refresh = vi.fn();
    let paused = true;
    const pending = createPendingRefresh(refresh, () => paused);

    pending.request();
    vi.advanceTimersByTime(LIVE_DEBOUNCE_MS);
    expect(refresh).not.toHaveBeenCalled();

    // Flush ainda pausado não recarrega
    pending.flush();
    expect(refresh).not.toHaveBeenCalled();

    // Pausa encerra (modal fechou) e flush dispara recarga pendente
    paused = false;
    pending.flush();
    expect(refresh).toHaveBeenCalledTimes(1);

    // Segundo flush sem novo aviso não recarrega de novo
    pending.flush();
    expect(refresh).toHaveBeenCalledTimes(1);

    pending.dispose();
  });
});
