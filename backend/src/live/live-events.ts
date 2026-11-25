import { MessageEvent } from '@nestjs/common';
import { Observable, Subscriber, Subscription } from 'rxjs';

export const LIVE_HEARTBEAT_MS = 25_000;

function subscribeHeartbeat(
  heartbeat: Observable<unknown>,
  isSessionAlive: () => boolean,
  subscriber: Subscriber<MessageEvent>,
): Subscription {
  return heartbeat.subscribe({
    next: () => {
      if (!isSessionAlive()) {
        subscriber.complete();
        return;
      }
      subscriber.next({ comment: 'ping' });
    },
    error: (err: unknown) => subscriber.error(err),
  });
}

/**
 * Monta o fluxo SSE do caixa: emite ready inicial, changed a cada aviso de escrita,
 * ping no heartbeat e encerra quando a sessão expirar (decisão de 2026-11-24).
 *
 * @example const events$ = buildLiveEvents(bus.changes(), interval(25_000), () => isAlive());
 */
export function buildLiveEvents(
  changes: Observable<void>,
  heartbeat: Observable<unknown>,
  isSessionAlive: () => boolean,
): Observable<MessageEvent> {
  return new Observable<MessageEvent>((subscriber) => {
    subscriber.next({ type: 'ready', data: {} });

    const changesSub = changes.subscribe({
      next: () => subscriber.next({ type: 'changed', data: {} }),
      error: (err: unknown) => subscriber.error(err),
    });
    const heartbeatSub = subscribeHeartbeat(
      heartbeat,
      isSessionAlive,
      subscriber,
    );

    return () => {
      changesSub.unsubscribe();
      heartbeatSub.unsubscribe();
    };
  });
}
