import { describe, expect, it } from 'vitest';
import type { OrderEvent, OrderSnapshot } from '../api/order-event-types';
import type { PaymentMethod } from '../api/types';
import { eventText } from './order-event-text';

const METHODS = [
  { id: 1, name: 'PIX' },
  { id: 2, name: 'Dinheiro' },
  { id: 3, name: 'Maquininha Ton' },
] as PaymentMethod[];

const SNAPSHOT: OrderSnapshot = {
  amount: '35.60',
  paymentMethodId: 2,
  paymentMode: null,
  items: '2× X Salada',
};

const event = (
  details: OrderEvent['details'],
  fields: Partial<OrderEvent> = {},
): OrderEvent => ({
  id: 1,
  at: '2026-09-22T23:41:00Z',
  userRole: 'CAIXA',
  managerAuthorized: false,
  details,
  ...fields,
});

describe('eventText', () => {
  it('lançado: valor, forma e itens', () => {
    expect(
      eventText(event({ kind: 'CREATED', order: SNAPSHOT }), METHODS),
    ).toBe('Lançado: R$ 35,60 · Dinheiro · 2× X Salada (caixa)');
  });

  it('alterado: só o que mudou, e a senha do admin quando usada', () => {
    const after = {
      ...SNAPSHOT,
      amount: '17.80',
      paymentMethodId: 3,
      paymentMode: 'PIX' as const,
    };
    const text = eventText(
      event(
        { kind: 'EDITED', before: SNAPSHOT, after },
        { managerAuthorized: true },
      ),
      METHODS,
    );
    expect(text).toBe(
      'Alterado: R$ 35,60 → R$ 17,80 · Dinheiro → Maquininha Ton · PIX (caixa, com a senha do admin)',
    );
  });

  it('status, cancelado (com o motivo) e desfeito pelo admin', () => {
    expect(
      eventText(
        event({ kind: 'STATUS', from: 'PREPARING', to: 'OUT_FOR_DELIVERY' }),
        METHODS,
      ),
    ).toBe('Em preparo → Saiu (caixa)');
    expect(
      eventText(
        event({ kind: 'CANCELED', reason: 'Cliente desistiu' }),
        METHODS,
      ),
    ).toBe('Cancelado: Cliente desistiu (caixa)');
    expect(
      eventText(event({ kind: 'RESTORED' }, { userRole: 'ADMIN' }), METHODS),
    ).toBe('Cancelamento desfeito (admin)');
  });

  it('"A pagar" quando não há forma', () => {
    const open = { ...SNAPSHOT, paymentMethodId: null };
    expect(
      eventText(event({ kind: 'CREATED', order: open }), METHODS),
    ).toContain('· A pagar ·');
  });
});
