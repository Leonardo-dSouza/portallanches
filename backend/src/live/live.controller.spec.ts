import { describe, expect, it, vi } from 'vitest';
import { AuthService } from '../auth/auth.service.js';
import { SessionUser } from '../auth/session-user.js';
import { DataChangeBus } from './data-change-bus.js';
import { LIVE_HEARTBEAT_MS } from './live-events.js';
import { LiveController } from './live.controller.js';

class FakeSessionAuth {
  private alive = true;

  authenticate(token: string): SessionUser | undefined {
    if (!this.alive) return undefined;
    if (token === 'tok') {
      return { id: 1, name: 'caixa', role: 'CAIXA' };
    }
    return undefined;
  }

  expireSession(): void {
    this.alive = false;
  }
}

describe('LiveController', () => {
  it('usa a sessão do token da requisição', () => {
    vi.useFakeTimers();
    try {
      const bus = new DataChangeBus();
      const fakeAuth = new FakeSessionAuth();
      const controller = new LiveController(
        bus,
        fakeAuth as unknown as AuthService,
      );

      let completed = false;
      const sub = controller.events('Bearer tok').subscribe({
        complete: () => {
          completed = true;
        },
      });

      vi.advanceTimersByTime(LIVE_HEARTBEAT_MS);
      expect(completed).toBe(false);

      fakeAuth.expireSession();

      vi.advanceTimersByTime(LIVE_HEARTBEAT_MS);
      expect(completed).toBe(true);

      sub.unsubscribe();
    } finally {
      vi.useRealTimers();
    }
  });
});
