import type { Customer, DeliveryZone, Order } from '../api/types';
import {
  buildOrderRequest,
  EMPTY_ORDER_FORM,
  formValuesOf,
  withOrderField,
  type OrderFormValues,
} from './order-form-values';
import type { DraftLine } from './order-lines';

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
  paymentMethodId: '1',
  ...overrides,
});

const TWO_X_SALADA: DraftLine[] = [
  {
    id: 1,
    productId: 1,
    name: 'X Salada',
    menuNumber: 9,
    categoryName: 'Tradicional',
    unitPrice: '17.80',
    quantity: 2,
    note: '',
    addons: [],
  },
];
const ITEMS = [{ productId: 1, quantity: 2 }];

/** Os testes variam o formulário; as linhas são sempre 2 X Salada. */
const build = (
  values: OrderFormValues,
  zones: DeliveryZone[],
  known: Customer | null,
) => buildOrderRequest(values, TWO_X_SALADA, zones, known);

/** Entrega com cliente preenchido; os testes variam bairro e taxa. */
const delivery = (overrides: Partial<OrderFormValues>): OrderFormValues =>
  form({
    type: 'DELIVERY',
    customerName: 'Ana',
    street: 'Rua A',
    houseNumber: '123',
    ...overrides,
  });

const NO_CUSTOMER_ORDER = {
  customerId: null,
  customerName: null,
  customerPhone: null,
  customerStreet: null,
  customerNumber: null,
  customerReference: null,
  dayNumber: 1,
  status: 'DELIVERED' as const,
  createdAt: '2026-09-22T23:00:00Z',
  changeFor: null,
};

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
      paymentMethodId: 3,
      paymentMode: 'CREDIT',
    });
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
        input: { items: ITEMS, type: 'COUNTER', paymentMethodId: 1 },
      },
    });
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
    expect(buildOrderRequest(form({}), [], ZONES, null)).toMatchObject({
      ok: false,
      error: expect.stringMatching(/pelo menos um item/),
    });
  });
});

describe('formValuesOf', () => {
  it('preenche o formulário de um pedido de entrega com vírgula decimal', () => {
    const order: Order = {
      id: 9,
      amount: '30.00',
      items: [],
      type: 'DELIVERY',
      paymentMethodId: 2,
      paymentMode: 'DEBIT',
      deliveryZoneId: 1,
      deliveryFee: '4.50',
      customerId: 7,
      customerName: 'Ana',
      customerPhone: '79999991234',
      customerStreet: 'Rua A',
      customerNumber: '123',
      customerReference: 'casa azul',
      dayNumber: 1,
      status: 'DELIVERED' as const,
      createdAt: '2026-09-22T23:00:00Z',
      changeFor: null,
    };
    expect(formValuesOf(order, ZONES)).toEqual({
      type: 'DELIVERY',
      paymentMethodId: '2',
      counterName: '',
      changeFor: '',
      paymentMode: 'DEBIT',
      neighborhood: 'Monterrey',
      fee: '4,50',
      phone: '79999991234',
      customerName: 'Ana',
      street: 'Rua A',
      houseNumber: '123',
      reference: 'casa azul',
    });
  });

  it('abre pedido importado (sem tipo, pagamento e taxa) com pagamento em branco', () => {
    const order: Order = {
      id: 10,
      amount: '36.40',
      items: [],
      type: null,
      paymentMethodId: null,
      paymentMode: null,
      deliveryZoneId: null,
      deliveryFee: null,
      ...NO_CUSTOMER_ORDER,
    };
    expect(formValuesOf(order, ZONES)).toEqual(EMPTY_ORDER_FORM);
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
