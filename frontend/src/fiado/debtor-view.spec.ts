import type {
  FiadoDebtor,
  FiadoOrderView,
  FiadoSettledCustomer,
} from '../api/fiado-types';
import {
  debtorRow,
  matchesDebtor,
  nextDueText,
  ordersCountText,
  settledRow,
} from './debtor-view';

const order = (dueDate: string | null): FiadoOrderView => ({
  orderId: 1,
  businessDate: '2026-10-20',
  dayNumber: 5,
  type: 'COUNTER',
  amount: '20.00',
  paidTotal: '0.00',
  remaining: '20.00',
  dueDate,
});

const JOSE: FiadoDebtor = {
  customerId: 15,
  name: 'José Antônio',
  phone: '79999991234',
  openTotal: '20.00',
  orders: [order('2026-10-30')],
};

describe('matchesDebtor', () => {
  it('pelo nome sem acento e sem maiúscula, ou por parte do telefone', () => {
    expect(matchesDebtor(JOSE, '')).toBe(true);
    expect(matchesDebtor(JOSE, 'jose ant')).toBe(true);
    expect(matchesDebtor(JOSE, '9999-1234')).toBe(true);
    expect(matchesDebtor(JOSE, 'maria')).toBe(false);
    expect(matchesDebtor({ ...JOSE, phone: null }, '9999')).toBe(false);
  });
});

describe('nextDueText', () => {
  it('a previsão mais próxima: atrasado, hoje, a data, ou sem data', () => {
    const today = '2026-10-26';
    const late = {
      ...JOSE,
      orders: [order('2026-10-30'), order('2026-10-22')],
    };
    expect(nextDueText(late, today)).toBe('atrasado desde 22/10');
    expect(nextDueText({ ...JOSE, orders: [order(today)] }, today)).toBe(
      'pagar hoje',
    );
    expect(nextDueText(JOSE, today)).toBe('pagar em 30/10');
    expect(nextDueText({ ...JOSE, orders: [order(null)] }, today)).toBe(
      'sem data',
    );
  });
});

describe('ordersCountText', () => {
  it('singular e plural', () => {
    expect(ordersCountText(1)).toBe('1 pedido');
    expect(ordersCountText(3)).toBe('3 pedidos');
  });
});

describe('debtorRow', () => {
  it('o total em aberto, com o telefone, os pedidos e a previsão embaixo', () => {
    expect(debtorRow(JOSE, '2026-10-26')).toEqual({
      customerId: 15,
      name: 'José Antônio',
      phone: '79999991234',
      total: '20.00',
      details: ['79999991234', '1 pedido', 'pagar em 30/10'],
    });
  });
});

describe('settledRow (2026-11-01)', () => {
  const ALEMAO: FiadoSettledCustomer = {
    customerId: 17,
    name: 'Alemão',
    phone: null,
    ordersCount: 1,
    paidTotal: '183.90',
    lastPaidOn: '2026-11-01',
  };

  it('o total dos pedidos, sem telefone, com a noite do pagamento embaixo', () => {
    expect(settledRow(ALEMAO)).toEqual({
      customerId: 17,
      name: 'Alemão',
      phone: null,
      total: '183.90',
      details: ['1 pedido', 'pago em 01/11'],
    });
  });

  it('sem noite de pagamento gravada, sem a data', () => {
    const row = settledRow({ ...ALEMAO, lastPaidOn: null });
    expect(row.details).toEqual(['1 pedido']);
  });
});
