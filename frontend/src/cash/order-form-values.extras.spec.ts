import { describe, expect, it } from 'vitest';
import type { Customer } from '../api/types';
import {
  build,
  delivery,
  form,
  ITEMS,
  METHODS,
  TWO_X_SALADA,
  ZONES,
} from '../test-support/order-form-fixtures';
import { buildOrderRequest, type OrderFormValues } from './order-form-values';
import type { DraftLine } from './order-lines';

describe('buildOrderRequest: adicionais e observação', () => {
  it('manda a observação e os adicionais (por unidade) só quando existem', () => {
    const line = TWO_X_SALADA[0];
    const withExtras: DraftLine = {
      ...line,
      note: 'sem tomate',
      addons: [
        { productId: 33, name: 'Add bacon', unitPrice: '6.00', quantity: 1 },
      ],
    };
    const built = buildOrderRequest(
      form({}),
      [withExtras, { ...line, id: 2 }],
      [],
      null,
      METHODS,
    );
    expect(built.ok && built.request.input.items).toEqual([
      {
        productId: 1,
        quantity: 2,
        note: 'sem tomate',
        addons: [{ productId: 33, quantity: 1 }],
      },
      { productId: 1, quantity: 2 },
    ]);
  });
});

describe('buildOrderRequest: fiado (2026-10-25)', () => {
  const MARIA: Customer = {
    id: 15,
    name: 'Maria',
    phone: '79999991234',
    street: 'Rua A',
    number: '12',
    reference: null,
    deliveryZoneId: 1,
  };
  const fiado = (overrides: Partial<OrderFormValues>) =>
    form({ paymentMethodId: '7', customerName: 'Maria', ...overrides });

  it('balcão: o cliente vai no lugar do nome do balcão, com o "Pagar em"', () => {
    const built = build(
      fiado({ counterName: 'Maria', fiadoDueDate: '2026-09-25' }),
      ZONES,
      null,
    );
    expect(built).toEqual({
      ok: true,
      request: {
        newZone: null,
        zoneId: null,
        customer: {
          id: null,
          name: 'Maria',
          phone: null,
          street: null,
          number: null,
          reference: null,
          changed: true,
        },
        input: {
          items: ITEMS,
          type: 'COUNTER',
          diningOption: 'TAKEAWAY',
          paymentMethodId: 7,
          fiadoDueDate: '2026-09-25',
        },
      },
    });
  });

  it('balcão sem cliente avisa', () => {
    expect(build(fiado({ customerName: '' }), ZONES, null)).toEqual({
      ok: false,
      error: 'Fiado precisa do cliente: digite o telefone ou o nome',
    });
  });

  it('balcão com cliente da entrega: o bairro dele fica no cadastro', () => {
    const built = build(fiado({ phone: '79999991234' }), ZONES, MARIA);
    expect(built).toMatchObject({
      ok: true,
      request: { zoneId: 1, customer: { id: 15, changed: false } },
    });
  });

  it('entrega fiado leva a previsão; sem data não manda o campo', () => {
    const dated = build(
      delivery({
        paymentMethodId: '7',
        neighborhood: 'Monterrey',
        fiadoDueDate: '2026-09-30',
      }),
      ZONES,
      null,
    );
    expect(dated.ok && dated.request.input.fiadoDueDate).toBe('2026-09-30');
    const undated = build(
      delivery({ paymentMethodId: '7', neighborhood: 'Monterrey' }),
      ZONES,
      null,
    );
    expect(undated.ok && undated.request.input).not.toHaveProperty(
      'fiadoDueDate',
    );
  });

  it('fora do fiado a previsão que sobrou não vai', () => {
    const built = build(form({ fiadoDueDate: '2026-09-30' }), ZONES, null);
    expect(built.ok && built.request.input).not.toHaveProperty('fiadoDueDate');
  });
});
