import type { DeliveryZone, Order } from '../api/types';
import {
  buildOrderRequest,
  EMPTY_ORDER_FORM,
  formValuesOf,
  type OrderFormValues,
} from './order-form-values';

const ZONES: DeliveryZone[] = [
  {
    id: 1,
    neighborhood: 'Monterrey',
    neighborhoodKey: 'monterrey',
    fee: '3.00',
    active: true,
  },
  {
    id: 2,
    neighborhood: 'Velho',
    neighborhoodKey: 'velho',
    fee: '2.00',
    active: false,
  },
];

const form = (overrides: Partial<OrderFormValues>): OrderFormValues => ({
  ...EMPTY_ORDER_FORM,
  amount: '25,50',
  paymentMethodId: '1',
  ...overrides,
});

describe('buildOrderRequest', () => {
  it('balcão: envia só valor, tipo e forma de pagamento', () => {
    expect(
      buildOrderRequest(form({ neighborhood: 'ignorado', fee: '9' }), ZONES),
    ).toEqual({
      ok: true,
      request: {
        newZone: null,
        input: { amount: '25.50', type: 'COUNTER', paymentMethodId: 1 },
      },
    });
  });

  it('entrega em bairro conhecido com a taxa padrão não envia deliveryFee', () => {
    const result = buildOrderRequest(
      form({ type: 'DELIVERY', neighborhood: ' MONTERREY ', fee: '3,00' }),
      ZONES,
    );
    expect(result).toMatchObject({
      ok: true,
      request: { newZone: null, input: { deliveryZoneId: 1 } },
    });
    expect(JSON.stringify(result)).not.toContain('deliveryFee');
  });

  it('taxa diferente da padrão vira sobrescrita só deste pedido', () => {
    const result = buildOrderRequest(
      form({ type: 'DELIVERY', neighborhood: 'Monterrey', fee: '4,5' }),
      ZONES,
    );
    expect(result).toMatchObject({
      ok: true,
      request: {
        newZone: null,
        input: { deliveryZoneId: 1, deliveryFee: '4.50' },
      },
    });
  });

  it('bairro novo exige taxa e pede o cadastro do bairro', () => {
    const missing = buildOrderRequest(
      form({ type: 'DELIVERY', neighborhood: 'Dunamis' }),
      ZONES,
    );
    expect(missing).toEqual({
      ok: false,
      error: 'Informe a taxa do bairro novo "Dunamis"',
    });
    const result = buildOrderRequest(
      form({ type: 'DELIVERY', neighborhood: ' Dunamis ', fee: '8' }),
      ZONES,
    );
    expect(result).toMatchObject({
      ok: true,
      request: { newZone: { neighborhood: 'Dunamis', fee: '8.00' } },
    });
  });

  it.each([
    [{ amount: 'R$ 5' }, /Valor inválido "R\$ 5"/],
    [{ paymentMethodId: '' }, /forma de pagamento/],
    [{ type: 'DELIVERY' as const, neighborhood: '' }, /bairro da entrega/],
    [
      { type: 'DELIVERY' as const, neighborhood: 'Monterrey', fee: '1,234' },
      /Taxa inválida "1,234"/,
    ],
    [{ type: 'DELIVERY' as const, neighborhood: 'Velho' }, /inativo/],
  ])('rejeita %j', (overrides, message) => {
    expect(buildOrderRequest(form(overrides), ZONES)).toMatchObject({
      ok: false,
      error: expect.stringMatching(message),
    });
  });
});

describe('formValuesOf', () => {
  it('preenche o formulário de um pedido de entrega com vírgula decimal', () => {
    const order: Order = {
      id: 9,
      amount: '30.00',
      type: 'DELIVERY',
      paymentMethodId: 2,
      deliveryZoneId: 1,
      deliveryFee: '4.50',
    };
    expect(formValuesOf(order, ZONES)).toEqual({
      type: 'DELIVERY',
      amount: '30,00',
      paymentMethodId: '2',
      neighborhood: 'Monterrey',
      fee: '4,50',
    });
  });
});
