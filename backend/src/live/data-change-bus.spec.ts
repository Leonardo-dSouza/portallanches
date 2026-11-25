import { describe, expect, it } from 'vitest';
import { DataChangeBus } from './data-change-bus.js';

describe('DataChangeBus', () => {
  it('entrega o aviso a quem assina e para de entregar depois do unsubscribe', () => {
    const bus = new DataChangeBus();
    const received: number[] = [];
    const subscription = bus.changes().subscribe(() => {
      received.push(1);
    });

    bus.announceChange();
    expect(received).toEqual([1]);

    subscription.unsubscribe();
    bus.announceChange();
    expect(received).toEqual([1]);
  });
});
