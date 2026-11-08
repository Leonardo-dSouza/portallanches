import { describe, expect, it } from 'vitest';
import type { Order } from '../api/types';
import { canReceive, paymentTagOf } from './payment-tag';

const DAY = {
  paymentMethods: [
    {
      id: 1,
      name: 'PIX',
      active: true,
      sortOrder: 0,
      isCardTerminal: false,
      isCash: false,
      isFiado: false,
    },
    {
      id: 2,
      name: 'Dinheiro',
      active: true,
      sortOrder: 1,
      isCardTerminal: false,
      isCash: true,
      isFiado: false,
    },
  ],
  zones: [],
};

/** Pedido base balcão pago via PIX. */
const BASE: Order = {
  id: 1,
  dayNumber: 1,
  status: 'DELIVERED',
  createdAt: '2026-10-10T22:00:00Z',
  statusChangedAt: '2026-10-10T22:00:00Z',
  canceledAt: null,
  cancelReason: null,
  amount: '30.00',
  items: [],
  type: 'COUNTER',
  diningOption: 'TAKEAWAY',
  paymentMethodId: 1,
  paymentMode: null,
  deliveryZoneId: null,
  deliveryFee: null,
  changeFor: null,
  customerId: null,
  customerName: 'João',
  customerPhone: null,
  customerStreet: null,
  customerNumber: null,
  customerReference: null,
  fiadoDueDate: null,
  fiado: null,
};

describe('paymentTagOf', () => {
  it('pedido pago: "Pago · {forma}", tom paid', () => {
    const tag = paymentTagOf(BASE, DAY);
    expect(tag).toEqual({ text: 'Pago · PIX', tone: 'paid' });
  });

  it('A pagar: "A pagar", tom open', () => {
    const order: Order = {
      ...BASE,
      paymentMethodId: null,
    };
    const tag = paymentTagOf(order, DAY);
    expect(tag).toEqual({ text: 'A pagar', tone: 'open' });
  });

  it('cancelado: null', () => {
    const order: Order = {
      ...BASE,
      canceledAt: '2026-10-10T23:00:00Z',
      cancelReason: 'Pedido duplicado',
    };
    expect(paymentTagOf(order, DAY)).toBeNull();
  });

  it('importado sem tipo e sem forma: null', () => {
    const order: Order = {
      ...BASE,
      type: null,
      paymentMethodId: null,
    };
    expect(paymentTagOf(order, DAY)).toBeNull();
  });

  it('fiado devendo: "Fiado · falta R$ X", tom fiado-owing, com sub', () => {
    const order: Order = {
      ...BASE,
      fiado: {
        paidTotal: '0.00',
        remaining: '30.00',
        dueDate: '2026-10-30',
        customerOpenTotal: '30.00',
      },
    };
    const tag = paymentTagOf(order, DAY);
    expect(tag).toEqual({
      text: 'Fiado · falta R$ 30,00',
      sub: 'pagar em 30/10',
      tone: 'fiado-owing',
    });
  });

  it('fiado quitado: "Fiado · pago", tom fiado-paid', () => {
    const order: Order = {
      ...BASE,
      fiado: {
        paidTotal: '30.00',
        remaining: '0.00',
        dueDate: null,
        customerOpenTotal: '0.00',
      },
    };
    const tag = paymentTagOf(order, DAY);
    expect(tag).toEqual({ text: 'Fiado · pago', tone: 'fiado-paid' });
  });
});

describe('canReceive', () => {
  it('o A pagar e o fiado devendo recebem; o pago, o quitado e o cancelado não', () => {
    const open: Order = { ...BASE, paymentMethodId: null };
    const owing: Order = {
      ...BASE,
      fiado: {
        paidTotal: '0.00',
        remaining: '30.00',
        dueDate: null,
        customerOpenTotal: '0.00',
      },
    };
    const settled: Order = {
      ...BASE,
      fiado: {
        paidTotal: '30.00',
        remaining: '0.00',
        dueDate: null,
        customerOpenTotal: '0.00',
      },
    };
    expect(canReceive(open)).toBe(true);
    expect(canReceive(owing)).toBe(true);
    expect(canReceive(BASE)).toBe(false);
    expect(canReceive(settled)).toBe(false);
    expect(canReceive({ ...open, canceledAt: '2026-10-10T23:00:00Z' })).toBe(
      false,
    );
  });
});
