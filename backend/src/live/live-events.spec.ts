import { MessageEvent } from '@nestjs/common';
import { Subject } from 'rxjs';
import { describe, expect, it } from 'vitest';
import { buildLiveEvents } from './live-events.js';

describe('buildLiveEvents', () => {
  it('manda ready antes de tudo', () => {
    const changes = new Subject<void>();
    const heartbeat = new Subject<unknown>();
    const events: MessageEvent[] = [];

    buildLiveEvents(changes, heartbeat, () => true).subscribe((e) => {
      events.push(e);
    });

    expect(events).toEqual([{ type: 'ready', data: {} }]);
  });

  it('vira cada aviso num changed', () => {
    const changes = new Subject<void>();
    const heartbeat = new Subject<unknown>();
    const events: MessageEvent[] = [];

    buildLiveEvents(changes, heartbeat, () => true).subscribe((e) => {
      events.push(e);
    });

    changes.next();
    changes.next();

    expect(events).toEqual([
      { type: 'ready', data: {} },
      { type: 'changed', data: {} },
      { type: 'changed', data: {} },
    ]);
  });

  it('manda ping a cada batida', () => {
    const changes = new Subject<void>();
    const heartbeat = new Subject<unknown>();
    const events: MessageEvent[] = [];

    buildLiveEvents(changes, heartbeat, () => true).subscribe((e) => {
      events.push(e);
    });

    heartbeat.next(1);
    heartbeat.next(2);

    expect(events).toEqual([
      { type: 'ready', data: {} },
      { comment: 'ping' },
      { comment: 'ping' },
    ]);
  });

  it('termina na batida em que a sessão venceu', () => {
    const changes = new Subject<void>();
    const heartbeat = new Subject<unknown>();
    const events: MessageEvent[] = [];
    let completed = false;
    let isAlive = true;

    buildLiveEvents(changes, heartbeat, () => isAlive).subscribe({
      next: (e) => events.push(e),
      complete: () => {
        completed = true;
      },
    });

    heartbeat.next(1);
    expect(events).toEqual([{ type: 'ready', data: {} }, { comment: 'ping' }]);

    isAlive = false;
    heartbeat.next(2);

    expect(completed).toBe(true);
    expect(events).toEqual([{ type: 'ready', data: {} }, { comment: 'ping' }]);
  });

  it('solta o bus quando o cliente sai', () => {
    const changes = new Subject<void>();
    const heartbeat = new Subject<unknown>();

    const sub = buildLiveEvents(changes, heartbeat, () => true).subscribe();
    expect(changes.observed).toBe(true);

    sub.unsubscribe();
    expect(changes.observed).toBe(false);
  });
});
