import type { DeliveryZone } from '../api/types';
import { orderFixture } from '../test-support/order-fixture';
import {
  buildOrderRequest,
  EMPTY_ORDER_FORM,
  formValuesOf,
  withOrderField,
  type OrderFormValues,
} from './order-form-values';
import type { DraftLine } from './order-lines';
import { OPEN_ACCOUNT } from './payment-choice';

const ZONES: DeliveryZone[] = [
  {
    id: 1,
    neighborhood: 'Monterrey',
    neighborhoodKey: 'monterrey',
    fee: '3.00',
    active: true,
  },
];
const LINES: DraftLine[] = [
  {
    id: 1,
    productId: 1,
    name: 'X Salada',
    menuNumber: 9,
    categoryName: 'Tradicional',
    unitPrice: '17.80',
    quantity: 1,
    note: '',
    addons: [],
  },
];

const form = (overrides: Partial<OrderFormValues>): OrderFormValues => ({
  ...EMPTY_ORDER_FORM,
  paymentMethodId: '1',
  ...overrides,
});
const inputOf = (values: OrderFormValues) => {
  const built = buildOrderRequest(values, LINES, ZONES, null);
  return built.ok ? built.request.input : built.error;
};

describe('comanda: nome no balcão e conta aberta (2026-10-10)', () => {
  it('balcão pago com nome manda o counterName (aparado)', () => {
    expect(inputOf(form({ counterName: ' João ' }))).toMatchObject({
      paymentMethodId: 1,
      counterName: 'João',
    });
    expect(inputOf(form({}))).not.toHaveProperty('counterName');
  });

  it('conta aberta: paymentMethodId null com o nome; sem nome, avisa', () => {
    const open = form({ paymentMethodId: OPEN_ACCOUNT, counterName: 'Maria' });
    expect(inputOf(open)).toMatchObject({
      paymentMethodId: null,
      counterName: 'Maria',
    });
    expect(inputOf({ ...open, counterName: ' ' })).toBe(
      'Conta aberta precisa do nome: digite o nome da pessoa no campo Nome',
    );
  });

  it('abre a conta aberta para receber: tecla Aberto marcada e o nome', () => {
    const order = orderFixture({
      paymentMethodId: null,
      customerName: 'Maria',
    });
    expect(formValuesOf(order, ZONES)).toMatchObject({
      paymentMethodId: OPEN_ACCOUNT,
      counterName: 'Maria',
      customerName: '',
    });
  });

  it('a entrega não fica aberta: virar entrega tira o Aberto', () => {
    const open = form({ paymentMethodId: OPEN_ACCOUNT, counterName: 'Maria' });
    expect(withOrderField(open, 'type', 'DELIVERY', ZONES)).toMatchObject({
      type: 'DELIVERY',
      paymentMethodId: '',
    });
  });
});

describe('comanda: "Troco para" na entrega', () => {
  const delivery = (overrides: Partial<OrderFormValues>) =>
    form({
      type: 'DELIVERY',
      neighborhood: 'Monterrey',
      customerName: 'Ana',
      street: 'Rua A',
      houseNumber: '10',
      paymentMethodId: '2',
      ...overrides,
    });

  it('manda o troco em formato da API; inválido avisa', () => {
    expect(inputOf(delivery({ changeFor: '100' }))).toMatchObject({
      changeFor: '100.00',
    });
    expect(inputOf(delivery({ changeFor: 'cem' }))).toBe(
      'Troco inválido "cem": digite só números (ex.: 50,00)',
    );
  });

  it('trocar a forma de pagamento limpa o troco', () => {
    const changed = withOrderField(
      delivery({ changeFor: '100' }),
      'paymentMethodId',
      '1',
      ZONES,
    );
    expect(changed.changeFor).toBe('');
  });

  it('abre a entrega com o troco gravado', () => {
    const order = orderFixture({
      type: 'DELIVERY',
      deliveryZoneId: 1,
      changeFor: '100.00',
    });
    expect(formValuesOf(order, ZONES).changeFor).toBe('100,00');
  });
});
