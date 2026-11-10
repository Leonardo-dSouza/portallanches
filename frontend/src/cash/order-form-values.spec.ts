import { describe, expect, it } from 'vitest';
import {
  build,
  delivery,
  form,
  ITEMS,
  METHODS,
  TWO_X_SALADA,
  ZONES,
} from '../test-support/order-form-fixtures';
import {
  buildOrderRequest,
  formTotalCents,
  withOrderField,
} from './order-form-values';
import { SPLIT } from './payment-choice';

describe('formTotalCents', () => {
  it('itens mais a taxa só na entrega (o que as partes do Dividir somam)', () => {
    expect(
      formTotalCents(form({ type: 'COUNTER', fee: '4,50' }), TWO_X_SALADA),
    ).toBe(3560);
    expect(
      formTotalCents(form({ type: 'DELIVERY', fee: '4,50' }), TWO_X_SALADA),
    ).toBe(4010);
  });
});

describe('buildOrderRequest', () => {
  it('envia o meio da maquininha quando escolhido', () => {
    const built = build(
      form({ paymentMethodId: '3', paymentMode: 'CREDIT' }),
      ZONES,
      null,
    );
    expect(built.ok && built.request.input).toEqual({
      items: ITEMS,
      type: 'COUNTER',
      diningOption: 'TAKEAWAY',
      paymentMethodId: 3,
      paymentMode: 'CREDIT',
    });
  });

  it('balcão dividido: manda as partes, sem forma única e sem troco (o balcão não tem)', () => {
    const values = form({
      paymentMethodId: SPLIT,
      splitParts: [
        { paymentMethodId: '1', paymentMode: '', amount: '20,00' },
        { paymentMethodId: '2', paymentMode: '', amount: '15,60' },
      ],
      changeFor: '50,00',
    });
    const built = build(values, ZONES, null);
    expect(built.ok).toBe(true);
    if (!built.ok) return;
    expect(built.request.input).toEqual({
      items: ITEMS,
      type: 'COUNTER',
      diningOption: 'TAKEAWAY',
      paymentParts: [
        { paymentMethodId: 1, amount: '20.00' },
        { paymentMethodId: 2, amount: '15.60' },
      ],
    });
    expect(built.request.input).not.toHaveProperty('paymentMethodId');
    expect(built.request.input).not.toHaveProperty('paymentMode');
  });

  it('balcão: envia só os itens, o tipo e a forma de pagamento', () => {
    expect(
      build(
        form({ neighborhood: 'ignorado', fee: '9', customerName: 'x' }),
        ZONES,
        null,
      ),
    ).toEqual({
      ok: true,
      request: {
        newZone: null,
        zoneId: null,
        customer: null,
        input: {
          items: ITEMS,
          type: 'COUNTER',
          diningOption: 'TAKEAWAY',
          paymentMethodId: 1,
        },
      },
    });
  });

  it('balcão: envia diningOption EAT_IN quando escolhido COMER', () => {
    const built = build(form({ diningOption: 'EAT_IN' }), ZONES, null);
    expect(built.ok && built.request.input.diningOption).toBe('EAT_IN');
  });

  it('entrega nunca envia diningOption', () => {
    const built = build(
      delivery({
        neighborhood: 'Monterrey',
        fee: '3,00',
        diningOption: 'EAT_IN',
      }),
      ZONES,
      null,
    );
    expect(built.ok).toBe(true);
    if (!built.ok) return;
    expect(built.request.input.diningOption).toBeUndefined();
  });

  it('entrega em bairro conhecido com a taxa padrão não envia deliveryFee', () => {
    const result = build(
      delivery({ neighborhood: ' MONTERREY ', fee: '3,00' }),
      ZONES,
      null,
    );
    expect(result).toMatchObject({
      ok: true,
      request: { newZone: null, zoneId: 1 },
    });
    expect(JSON.stringify(result)).not.toContain('deliveryFee');
  });

  it('taxa diferente da padrão vira sobrescrita só deste pedido', () => {
    const result = build(
      delivery({ neighborhood: 'Monterrey', fee: '4,5' }),
      ZONES,
      null,
    );
    expect(result).toMatchObject({
      ok: true,
      request: { newZone: null, zoneId: 1, input: { deliveryFee: '4.50' } },
    });
  });

  it('bairro novo exige taxa e pede o cadastro do bairro', () => {
    const missing = build(delivery({ neighborhood: 'Dunamis' }), ZONES, null);
    expect(missing).toEqual({
      ok: false,
      error: 'Informe a taxa do bairro novo "Dunamis"',
    });
    const result = build(
      delivery({ neighborhood: ' Dunamis ', fee: '8' }),
      ZONES,
      null,
    );
    expect(result).toMatchObject({
      ok: true,
      request: {
        newZone: { neighborhood: 'Dunamis', fee: '8.00' },
        zoneId: null,
        customer: { id: null, name: 'Ana', changed: true },
      },
    });
  });

  it('entrega leva o cliente a cadastrar junto', () => {
    const result = build(
      delivery({ neighborhood: 'Monterrey', phone: '(79) 99999-1234' }),
      ZONES,
      null,
    );
    expect(result).toMatchObject({
      ok: true,
      request: {
        customer: {
          id: null,
          name: 'Ana',
          phone: '79999991234',
          street: 'Rua A',
          number: '123',
          reference: null,
        },
      },
    });
  });

  it.each([
    [{ paymentMethodId: '' }, /forma de pagamento/],
    [{ type: 'DELIVERY' as const, neighborhood: '' }, /bairro da entrega/],
    [
      { type: 'DELIVERY' as const, neighborhood: 'Monterrey', fee: '1,234' },
      /Taxa inválida "1,234"/,
    ],
    [{ type: 'DELIVERY' as const, neighborhood: 'Velho' }, /inativo/],
    [
      { type: 'DELIVERY' as const, neighborhood: 'Monterrey' },
      /nome do cliente/,
    ],
  ])('rejeita %j', (overrides, message) => {
    expect(build(form(overrides), ZONES, null)).toMatchObject({
      ok: false,
      error: expect.stringMatching(message),
    });
  });

  it('sem itens avisa e não monta o pedido', () => {
    expect(buildOrderRequest(form({}), [], ZONES, null, METHODS)).toMatchObject(
      {
        ok: false,
        error: expect.stringMatching(/pelo menos um item/),
      },
    );
  });
});

describe('withOrderField', () => {
  it('bairro conhecido traz a taxa dele; bairro novo deixa a taxa vazia', () => {
    const known = withOrderField(form({}), 'neighborhood', 'monterrey', ZONES);
    expect(known).toMatchObject({ neighborhood: 'monterrey', fee: '3,00' });
    expect(withOrderField(known, 'neighborhood', 'Novo', ZONES).fee).toBe('');
  });

  it('trocar a forma de pagamento limpa o meio da maquininha', () => {
    const values = form({ paymentMode: 'CREDIT' });
    expect(withOrderField(values, 'paymentMethodId', '2', ZONES)).toMatchObject(
      {
        paymentMethodId: '2',
        paymentMode: '',
      },
    );
  });
});
