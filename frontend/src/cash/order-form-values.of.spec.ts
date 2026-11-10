import { describe, expect, it } from 'vitest';
import type { Order } from '../api/types';
import { NO_CUSTOMER_ORDER, ZONES } from '../test-support/order-form-fixtures';
import { EMPTY_ORDER_FORM, formValuesOf } from './order-form-values';
import { SPLIT } from './payment-choice';

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
      fiadoDueDate: null,
      fiado: null,
      paymentParts: [],
      dayNumber: 1,
      status: 'DELIVERED' as const,
      createdAt: '2026-09-22T23:00:00Z',
      statusChangedAt: '2026-09-22T23:00:00Z',
      canceledAt: null,
      cancelReason: null,
      changeFor: null,
      diningOption: null,
    };
    expect(formValuesOf(order, ZONES)).toEqual({
      type: 'DELIVERY',
      diningOption: 'TAKEAWAY',
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
      fiadoDueDate: '',
      splitParts: [],
    });
  });

  it('abre pedido dividido com as partes e a sentinela SPLIT', () => {
    const order: Order = {
      ...NO_CUSTOMER_ORDER,
      id: 11,
      amount: '35.60',
      items: [],
      type: 'COUNTER',
      paymentMethodId: 1,
      paymentMode: null,
      deliveryZoneId: null,
      deliveryFee: '0.00',
      paymentParts: [
        { paymentMethodId: 1, paymentMode: null, amount: '20.00' },
        { paymentMethodId: 2, paymentMode: null, amount: '15.60' },
      ],
    };
    expect(formValuesOf(order, ZONES)).toMatchObject({
      paymentMethodId: SPLIT,
      splitParts: [
        { paymentMethodId: '1', paymentMode: '', amount: '20,00' },
        { paymentMethodId: '2', paymentMode: '', amount: '15,60' },
      ],
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

describe('formValuesOf: fiado no balcão', () => {
  it('abre com o cliente (telefone e nome) e a previsão, sem o nome do balcão', () => {
    const order: Order = {
      ...NO_CUSTOMER_ORDER,
      id: 9,
      amount: '17.80',
      items: [],
      type: 'COUNTER',
      paymentMethodId: 7,
      paymentMode: null,
      deliveryZoneId: null,
      deliveryFee: '0.00',
      customerId: 15,
      customerName: 'Maria',
      customerPhone: '79999991234',
      fiadoDueDate: '2026-09-25',
    };
    expect(formValuesOf(order, ZONES)).toMatchObject({
      paymentMethodId: '7',
      counterName: '',
      customerName: 'Maria',
      phone: '79999991234',
      fiadoDueDate: '2026-09-25',
    });
  });
});
