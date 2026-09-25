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

/** Entrega com cliente preenchido; os testes variam bairro e taxa. */
const delivery = (overrides: Partial<OrderFormValues>): OrderFormValues =>
  form({
    type: 'DELIVERY',
    customerName: 'Ana',
    street: 'Rua A',
    ...overrides,
  });

const NO_CUSTOMER_ORDER = {
  customerId: null,
  customerName: null,
  customerPhone: null,
  customerStreet: null,
};

describe('buildOrderRequest', () => {
  it('balcão: envia só valor, tipo e forma de pagamento', () => {
    expect(
      buildOrderRequest(
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
        input: { amount: '25.50', type: 'COUNTER', paymentMethodId: 1 },
      },
    });
  });

  it('entrega em bairro conhecido com a taxa padrão não envia deliveryFee', () => {
    const result = buildOrderRequest(
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
    const result = buildOrderRequest(
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
    const missing = buildOrderRequest(
      delivery({ neighborhood: 'Dunamis' }),
      ZONES,
      null,
    );
    expect(missing).toEqual({
      ok: false,
      error: 'Informe a taxa do bairro novo "Dunamis"',
    });
    const result = buildOrderRequest(
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
    const result = buildOrderRequest(
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
        },
      },
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
    [
      { type: 'DELIVERY' as const, neighborhood: 'Monterrey' },
      /nome do cliente/,
    ],
  ])('rejeita %j', (overrides, message) => {
    expect(buildOrderRequest(form(overrides), ZONES, null)).toMatchObject({
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
      customerId: 7,
      customerName: 'Ana',
      customerPhone: '79999991234',
      customerStreet: 'Rua A',
    };
    expect(formValuesOf(order, ZONES)).toEqual({
      type: 'DELIVERY',
      amount: '30,00',
      paymentMethodId: '2',
      neighborhood: 'Monterrey',
      fee: '4,50',
      phone: '79999991234',
      customerName: 'Ana',
      street: 'Rua A',
    });
  });

  it('abre pedido importado (sem tipo, pagamento e taxa) com pagamento em branco', () => {
    const order: Order = {
      id: 10,
      amount: '36.40',
      type: null,
      paymentMethodId: null,
      deliveryZoneId: null,
      deliveryFee: null,
      ...NO_CUSTOMER_ORDER,
    };
    expect(formValuesOf(order, ZONES)).toEqual({
      ...EMPTY_ORDER_FORM,
      amount: '36,40',
    });
  });
});
