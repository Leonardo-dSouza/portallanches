import type { OrderFiado } from '../api/fiado-types';
import type { PaymentMethod } from '../api/types';
import { orderFixture } from '../test-support/order-fixture';
import {
  dueStatusText,
  fiadoOrderLabel,
  fiadoPaidText,
  fiadoStatusText,
  fiadoSummary,
  fiadoTargetOfOrder,
} from './fiado-labels';

const FIADO: OrderFiado = {
  dueDate: null,
  paidTotal: '0.00',
  remaining: '17.80',
  customerOpenTotal: '17.80',
};

describe('fiadoStatusText', () => {
  it('pago, falta (com algo recebido), a previsão ou sem data', () => {
    const paid = { ...FIADO, paidTotal: '17.80', remaining: '0.00' };
    expect(fiadoStatusText(paid)).toBe('pago');
    const partial = { ...FIADO, paidTotal: '0.80', remaining: '17.00' };
    expect(fiadoStatusText(partial)).toBe('falta R$ 17,00');
    const dated = { ...FIADO, dueDate: '2026-10-30' };
    expect(fiadoStatusText(dated)).toBe('pagar em 30/10');
    expect(fiadoStatusText(FIADO)).toBe('sem data');
  });
});

describe('dueStatusText', () => {
  it('previsto para a noite ou atrasado', () => {
    expect(dueStatusText('2026-10-26', '2026-10-26')).toBe(
      'previsto para hoje',
    );
    expect(dueStatusText('2026-10-25', '2026-10-26')).toBe(
      'previsto 25/10, atrasado',
    );
  });
});

it('fiadoPaidText: o valor, o adicional quando tem e a forma', () => {
  const methods = [{ id: 2, name: 'Dinheiro' }] as PaymentMethod[];
  const paid = {
    amount: '30.00',
    extra: '2.00',
    paymentMethodId: 2,
    paymentMode: null,
  };
  expect(fiadoPaidText(paid, methods)).toBe(
    'R$ 30,00 + adicional R$ 2,00 · Dinheiro',
  );
  expect(fiadoPaidText({ ...paid, extra: '0.00' }, methods)).toBe(
    'R$ 30,00 · Dinheiro',
  );
});

it('fiadoOrderLabel: o número e a noite com o dia da semana', () => {
  expect(fiadoOrderLabel({ dayNumber: 5, businessDate: '2026-09-20' })).toBe(
    '#5 de dom 20/09',
  );
});

describe('fiadoSummary', () => {
  const target = {
    orderId: 50,
    dayNumber: 5,
    businessDate: '2026-09-20',
    customerName: 'Maria',
    amount: '50.00',
    paidTotal: '3.00',
    remaining: '47.00',
    dueDate: null,
  };

  it('o pedido, o valor, o já pago (quando tem) e o que falta', () => {
    expect(fiadoSummary(target)).toBe(
      '#5 de dom 20/09 · R$ 50,00 · já pago R$ 3,00 · falta R$ 47,00',
    );
    expect(fiadoSummary({ ...target, paidTotal: '0.00' })).toBe(
      '#5 de dom 20/09 · R$ 50,00 · falta R$ 47,00',
    );
  });
});

describe('fiadoTargetOfOrder', () => {
  it('o pedido da noite com o bloco fiado vira o alvo do Receber', () => {
    const order = orderFixture({
      id: 7,
      dayNumber: 3,
      customerName: 'Maria',
      amount: '17.80',
      fiado: { ...FIADO, dueDate: '2026-10-30' },
    });
    expect(fiadoTargetOfOrder(order, '2026-10-26')).toEqual({
      orderId: 7,
      dayNumber: 3,
      businessDate: '2026-10-26',
      customerName: 'Maria',
      amount: '17.80',
      paidTotal: '0.00',
      remaining: '17.80',
      dueDate: '2026-10-30',
    });
    expect(fiadoTargetOfOrder(orderFixture(), '2026-10-26')).toBeNull();
  });
});
