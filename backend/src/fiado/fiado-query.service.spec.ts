import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { ADMIN, CAIXA } from '../orders/order-fakes.fixture.js';
import { buildFiado, MARIA_ORDER } from './fiado-fakes.fixture.js';

// Fiado (pedido do usuário, 2026-10-25): quem deve, os do dia e o extrato.
describe('FiadoQueryService', () => {
  it('quem deve: o cliente com o total e os pedidos em aberto', async () => {
    const { queries, payments } = buildFiado();
    await payments.receive(CAIXA, 1, { amount: 7, paymentMethodId: 1 });
    expect(await queries.listOpen()).toEqual([
      {
        customerId: 7,
        name: 'Maria',
        phone: '79988881111',
        openTotal: '40.00',
        orders: [expect.objectContaining({ orderId: 1, remaining: '40.00' })],
      },
    ]);
  });

  it('os do dia saem na noite escolhida (a de hoje, sem data); o caixa não escolhe outra', async () => {
    const { queries, fiado, closings } = buildFiado();
    fiado.orders[0].dueDate = '2026-09-21';
    fiado.orders.push({ ...MARIA_ORDER, orderId: 2, dueDate: '2026-09-23' });
    const due = await queries.listDue(CAIXA);
    expect(due.map((d) => [d.orderId, d.customerName])).toEqual([[1, 'Maria']]);
    expect(closings.askedDates).toEqual([undefined]);
    await queries.listDue(ADMIN, '2026-09-22');
    expect(closings.askedDates).toEqual([undefined, '2026-09-22']);
    closings.getFor = async () => {
      throw new ForbiddenException('Perfil CAIXA só abre a noite em andamento');
    };
    await expect(queries.listDue(CAIXA, '2026-09-01')).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('o extrato do cliente, com os recebimentos (os estornados também)', async () => {
    const { queries, payments } = buildFiado();
    const first = await payments.receive(CAIXA, 1, {
      amount: 20,
      paymentMethodId: 1,
    });
    await payments.cancel(CAIXA, first.payment.id, { reason: 'Errado' });
    await payments.receive(CAIXA, 1, { amount: 47, paymentMethodId: 2 });
    const statement = await queries.statement(7);
    expect(statement).toMatchObject({
      customer: { id: 7, name: 'Maria' },
      openTotal: '0.00',
      openOrders: [],
      paidOrders: [expect.objectContaining({ orderId: 1, paidTotal: '47.00' })],
    });
    expect(
      statement.payments.map((p) => [p.id, p.canceledAt !== null]),
    ).toEqual([
      [2, false],
      [1, true],
    ]);
  });

  it('extrato de cliente inexistente é 404', async () => {
    await expect(buildFiado().queries.statement(99)).rejects.toThrow(
      NotFoundException,
    );
  });
});
