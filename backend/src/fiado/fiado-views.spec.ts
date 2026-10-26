import type {
  FiadoOrderRecord,
  FiadoPaymentRecord,
} from './fiado-repository.js';
import { debtorsOf, dueOn, statementOf } from './fiado-views.js';

const order = (fields: Partial<FiadoOrderRecord>): FiadoOrderRecord => ({
  orderId: 1,
  businessDate: '2026-09-20',
  dayNumber: 5,
  type: 'COUNTER',
  amount: '47.00',
  paid: '0.00',
  canceled: false,
  dueDate: null,
  customerId: 7,
  customerName: 'Maria',
  customerPhone: '79988881111',
  ...fields,
});

const payment = (fields: Partial<FiadoPaymentRecord>): FiadoPaymentRecord => ({
  id: 1,
  orderId: 1,
  orderDayNumber: 5,
  orderBusinessDate: '2026-09-20',
  closingId: 10,
  businessDate: '2026-09-22',
  amount: '20.00',
  extra: '0.00',
  paymentMethodId: 1,
  paymentMode: null,
  createdAt: new Date('2026-09-22T23:00:00Z'),
  canceledAt: null,
  cancelReason: null,
  ...fields,
});

// Fiado (pedido do usuário, 2026-10-25): quem deve, os do dia e o extrato.
describe('fiado-views', () => {
  it('quem deve: um por cliente, só o que falta, em ordem de nome', () => {
    const debtors = debtorsOf([
      order({ orderId: 1, paid: '20.00' }),
      order({ orderId: 2, amount: '10.00', dueDate: '2026-09-25' }),
      order({ orderId: 3, amount: '8.00', paid: '8.00' }),
      order({ orderId: 4, customerId: 8, customerName: 'Álvaro' }),
    ]);
    expect(debtors.map((d) => [d.name, d.openTotal])).toEqual([
      ['Álvaro', '47.00'],
      ['Maria', '37.00'],
    ]);
    expect(debtors[1].orders).toEqual([
      {
        orderId: 1,
        businessDate: '2026-09-20',
        dayNumber: 5,
        type: 'COUNTER',
        amount: '47.00',
        paidTotal: '20.00',
        remaining: '27.00',
        dueDate: null,
      },
      expect.objectContaining({ orderId: 2, remaining: '10.00' }),
    ]);
  });

  it('os do dia: de outras noites, com a previsão até a data e algo a pagar', () => {
    const due = dueOn(
      [
        order({ orderId: 1, dueDate: '2026-09-22' }),
        order({
          orderId: 2,
          dueDate: '2026-09-21',
          businessDate: '2026-09-19',
        }),
        order({ orderId: 3, dueDate: '2026-09-23' }),
        order({ orderId: 4, dueDate: null }),
        order({ orderId: 5, dueDate: '2026-09-22', paid: '47.00' }),
        order({
          orderId: 6,
          dueDate: '2026-09-22',
          businessDate: '2026-09-22',
        }),
      ],
      '2026-09-22',
    );
    expect(due.map((d) => d.orderId)).toEqual([2, 1]);
    expect(due[0]).toMatchObject({ customerName: 'Maria', remaining: '47.00' });
  });

  it('o extrato separa em aberto e pagos e leva os recebimentos (os estornados também)', () => {
    const statement = statementOf(
      { id: 7, name: 'Maria', phone: '79988881111' },
      [
        order({ orderId: 1, paid: '20.00' }),
        order({ orderId: 2, paid: '47.00' }),
      ],
      [
        payment({ id: 2, canceledAt: new Date(), cancelReason: 'errado' }),
        payment({}),
      ],
    );
    expect(statement.openTotal).toBe('27.00');
    expect(statement.openOrders.map((o) => o.orderId)).toEqual([1]);
    expect(statement.paidOrders.map((o) => o.orderId)).toEqual([2]);
    expect(statement.payments.map((p) => p.id)).toEqual([2, 1]);
  });
});
