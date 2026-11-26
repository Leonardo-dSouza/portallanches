import { describe, expect, it } from 'vitest';
import type { Order } from '../api/types';
import { breakOnlyAtDots, canReceive, paymentTagOf } from './payment-tag';

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
      isIfood: false,
    },
    {
      id: 2,
      name: 'Dinheiro',
      active: true,
      sortOrder: 1,
      isCardTerminal: false,
      isCash: true,
      isFiado: false,
      isIfood: false,
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
  deliveryCode: null,
  ifoodCode: null,
  fiadoDueDate: null,
  fiado: null,
  paymentParts: [],
  prepaid: false,
};

describe('paymentTagOf', () => {
  it('pedido pago: "Pago · {forma}", tom paid', () => {
    const tag = paymentTagOf(BASE, DAY);
    expect(tag).toEqual({ text: 'Pago · PIX', tone: 'paid' });
  });

  it('pedido dividido pago: "Pago · dividido", tom paid', () => {
    const splitOrder: Order = {
      ...BASE,
      paymentParts: [
        { paymentMethodId: 1, paymentMode: null, amount: '10.00' },
        { paymentMethodId: 2, paymentMode: null, amount: '20.00' },
      ],
    };
    expect(paymentTagOf(splitOrder, DAY)).toEqual({
      text: 'Pago · dividido',
      tone: 'paid',
    });
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

  it('entrega prepaid em preparo: "Pago · PIX", tom paid', () => {
    const order: Order = {
      ...BASE,
      type: 'DELIVERY',
      status: 'PREPARING',
      prepaid: true,
      paymentMethodId: 1,
    };
    expect(paymentTagOf(order, DAY)).toEqual({
      text: 'Pago · PIX',
      tone: 'paid',
    });
  });

  it('entrega sem prepaid em preparo ou saiu: só a forma, tom method-only', () => {
    const cartaoDay = {
      ...DAY,
      paymentMethods: [
        ...DAY.paymentMethods,
        {
          id: 3,
          name: 'Cartão Ton',
          active: true,
          sortOrder: 2,
          isCardTerminal: true,
          isCash: false,
          isFiado: false,
          isIfood: false,
        },
      ],
    };
    const preparing: Order = {
      ...BASE,
      type: 'DELIVERY',
      status: 'PREPARING',
      prepaid: false,
      paymentMethodId: 3,
      paymentMode: 'CREDIT',
    };
    expect(paymentTagOf(preparing, cartaoDay)).toEqual({
      text: 'Cartão Ton · Crédito',
      tone: 'method-only',
    });

    const out: Order = {
      ...preparing,
      status: 'OUT_FOR_DELIVERY',
    };
    expect(paymentTagOf(out, cartaoDay)).toEqual({
      text: 'Cartão Ton · Crédito',
      tone: 'method-only',
    });
  });

  it('entrega sem prepaid já entregue: volta a "Pago · forma", tom paid (Review Focus 5)', () => {
    const cartaoDay = {
      ...DAY,
      paymentMethods: [
        ...DAY.paymentMethods,
        {
          id: 3,
          name: 'Cartão Ton',
          active: true,
          sortOrder: 2,
          isCardTerminal: true,
          isCash: false,
          isFiado: false,
          isIfood: false,
        },
      ],
    };
    const delivered: Order = {
      ...BASE,
      type: 'DELIVERY',
      status: 'DELIVERED',
      prepaid: false,
      paymentMethodId: 3,
      paymentMode: 'CREDIT',
    };
    expect(paymentTagOf(delivered, cartaoDay)).toEqual({
      text: 'Pago · Cartão Ton · Crédito',
      tone: 'paid',
    });
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

describe('breakOnlyAtDots (lista do PC do caixa, 2026-11-11)', () => {
  const NBSP = '\u00a0';

  it('só o espaço depois do ponto do meio deixa quebrar a linha', () => {
    expect(breakOnlyAtDots('Pago · Cartão Ton · Crédito')).toBe(
      `Pago${NBSP}· Cartão${NBSP}Ton${NBSP}· Crédito`,
    );
    expect(breakOnlyAtDots('Fiado · falta R$ 55,40')).toBe(
      `Fiado${NBSP}· falta${NBSP}R$${NBSP}55,40`,
    );
  });

  it('etiqueta sem ponto não quebra', () => {
    expect(breakOnlyAtDots('A pagar')).toBe(`A${NBSP}pagar`);
  });
});
