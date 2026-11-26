export const LIVE_DEBOUNCE_MS = 300;
export const LIVE_PENDING_CHECK_MS = 2_000;

export interface PendingRefresh {
  request(): void;
  flush(): void;
  dispose(): void;
}

class PendingRefreshController implements PendingRefresh {
  private timer: ReturnType<typeof setTimeout> | null = null;
  private hasPending = false;
  private readonly refresh: () => void;
  private readonly isPaused: () => boolean;

  constructor(refresh: () => void, isPaused: () => boolean) {
    this.refresh = refresh;
    this.isPaused = isPaused;
  }

  request(): void {
    if (this.timer !== null) clearTimeout(this.timer);
    this.timer = setTimeout(() => this.onTimerFired(), LIVE_DEBOUNCE_MS);
  }

  flush(): void {
    if (!this.hasPending || this.isPaused()) return;
    this.hasPending = false;
    this.refresh();
  }

  dispose(): void {
    if (this.timer !== null) clearTimeout(this.timer);
    this.timer = null;
    this.hasPending = false;
  }

  private onTimerFired(): void {
    this.timer = null;
    if (this.isPaused()) {
      this.hasPending = true;
      return;
    }
    this.refresh();
  }
}

/**
 * Junta avisos em 300 ms; na pausa, guarda um pendente que flush solta quando a pausa acaba.
 *
 * @example const pending = createPendingRefresh(() => reload(), isRefreshPaused);
 */
export function createPendingRefresh(
  refresh: () => void,
  isPaused: () => boolean,
): PendingRefresh {
  return new PendingRefreshController(refresh, isPaused);
}
