import type { FiadoDebtor, FiadoOrderView } from '../api/fiado-types';
import { matchesDebtor, nextDueText, ordersCountText } from './debtor-view';

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
