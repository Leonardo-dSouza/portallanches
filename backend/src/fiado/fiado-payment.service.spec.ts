import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ADMIN, CAIXA } from '../orders/order-fakes.fixture.js';
import { buildFiado, PAID_AT } from './fiado-fakes.fixture.js';

const after = (minutes: number) =>
  new Date(PAID_AT.getTime() + minutes * 60_000);

// Fiado (pedido do usuário, 2026-10-25): receber parcial com adicional, estornar e remarcar.
describe('FiadoPaymentService', () => {
  it('recebe parte no PIX com adicional: entra na noite de hoje e sobra o resto', async () => {
    const { payments, fiado } = buildFiado();
    const receipt = await payments.receive(CAIXA, 1, {
      amount: '20.00',
      extra: '5.00',
      paymentMethodId: 1,
    });
    expect(receipt).toMatchObject({
      customerId: 7,
      customerName: 'Maria',
      remaining: '27.00',
      customerOpenTotal: '27.00',
      payment: {
        orderId: 1,
        orderDayNumber: 5,
        orderBusinessDate: '2026-09-20',
        closingId: 10,
        businessDate: '2026-09-22',
        amount: '20.00',
        extra: '5.00',
      },
    });
    expect(fiado.events[0]).toMatchObject({
      orderId: 1,
      userId: CAIXA.id,
      details: { kind: 'FIADO_PAYMENT', payment: { amount: '20.00' } },
    });
  });

  it('não recebe mais do que falta nem o que já está pago', async () => {
    const { payments } = buildFiado();
    const over = payments.receive(CAIXA, 1, {
      amount: 47.01,
      paymentMethodId: 1,
    });
    await expect(over).rejects.toThrow(UnprocessableEntityException);
    await expect(over).rejects.toThrow(
      'Valor 47.01 maior que o que falta no pedido #5 (47.00): esperado de 0.01 até 47.00',
    );
    await payments.receive(CAIXA, 1, { amount: 47, paymentMethodId: 1 });
    await expect(
      payments.receive(CAIXA, 1, { amount: 1, paymentMethodId: 1 }),
    ).rejects.toThrow(/#5 de 2026-09-20 já está pago/);
  });

  it('a forma do recebimento não pode ser a fiado; maquininha pede o meio', async () => {
    const { payments } = buildFiado();
    const viaFiado = payments.receive(CAIXA, 1, {
      amount: 10,
      paymentMethodId: 4,
    });
    await expect(viaFiado).rejects.toThrow(BadRequestException);
    await expect(viaFiado).rejects.toThrow(/Forma de pagamento 4 é fiado/);
    await expect(
      payments.receive(CAIXA, 1, { amount: 10, paymentMethodId: 3 }),
    ).rejects.toThrow(/maquininha/);
  });

  it('pedido que não é fiado é 404; cancelado é 409', async () => {
    const { payments, fiado } = buildFiado();
    await expect(
      payments.receive(CAIXA, 99, { amount: 1, paymentMethodId: 1 }),
    ).rejects.toThrow(NotFoundException);
    fiado.orders[0].canceled = true;
    await expect(
      payments.receive(CAIXA, 1, { amount: 1, paymentMethodId: 1 }),
    ).rejects.toThrow(ConflictException);
  });

  it('a noite vem da data escolhida, com a regra de quem lança nela', async () => {
    const { payments, closings } = buildFiado();
    await payments.receive(ADMIN, 1, {
      amount: 5,
      paymentMethodId: 1,
      date: '2026-09-22',
    });
    expect(closings.askedDates).toEqual(['2026-09-22']);
    closings.today = { ...closings.today, status: 'CLOSED' };
    await expect(
      payments.receive(CAIXA, 1, { amount: 5, paymentMethodId: 1 }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('estorno dentro da trava: o caixa estorna sozinho, com motivo, e o que falta volta', async () => {
    const { payments, fiado } = buildFiado(after(5));
    const { payment } = await payments.receive(CAIXA, 1, {
      amount: 20,
      paymentMethodId: 1,
    });
    const receipt = await payments.cancel(CAIXA, payment.id, {
      reason: 'Valor errado',
    });
    expect(receipt.remaining).toBe('47.00');
    expect(receipt.payment.cancelReason).toBe('Valor errado');
    expect(fiado.events[1]).toMatchObject({
      managerAuthorized: false,
      details: {
        kind: 'FIADO_PAYMENT_CANCELED',
        reason: 'Valor errado',
        payment: { paymentId: payment.id, amount: '20.00' },
      },
    });
  });

  it('estorno fora da trava pede a senha do admin; com ela passa', async () => {
    const { payments, manager, fiado } = buildFiado(after(20));
    const { payment } = await payments.receive(CAIXA, 1, {
      amount: 20,
      paymentMethodId: 1,
    });
    await expect(
      payments.cancel(CAIXA, payment.id, { reason: 'Valor errado' }),
    ).rejects.toThrow(ForbiddenException);
    await payments.cancel(CAIXA, payment.id, {
      reason: 'Valor errado',
      managerPassword: 'admin123',
    });
    expect(manager.received).toEqual([undefined, 'admin123']);
    expect(fiado.events[1].managerAuthorized).toBe(true);
  });

  it('estorno sem motivo, de recebimento inexistente ou já estornado é recusado', async () => {
    const { payments } = buildFiado();
    const { payment } = await payments.receive(CAIXA, 1, {
      amount: 20,
      paymentMethodId: 1,
    });
    await expect(payments.cancel(CAIXA, payment.id, {})).rejects.toThrow(
      BadRequestException,
    );
    await expect(
      payments.cancel(CAIXA, 99, { reason: 'Valor errado' }),
    ).rejects.toThrow(NotFoundException);
    await payments.cancel(CAIXA, payment.id, { reason: 'Valor errado' });
    await expect(
      payments.cancel(CAIXA, payment.id, { reason: 'Valor errado' }),
    ).rejects.toThrow(/já foi estornado/);
  });

  it('estorno de noite fechada é com o admin', async () => {
    const { payments, closings } = buildFiado();
    const { payment } = await payments.receive(CAIXA, 1, {
      amount: 20,
      paymentMethodId: 1,
    });
    closings.today = { ...closings.today, status: 'CLOSED' };
    await expect(
      payments.cancel(CAIXA, payment.id, { reason: 'Valor errado' }),
    ).rejects.toThrow(ForbiddenException);
    const receipt = await payments.cancel(ADMIN, payment.id, {
      reason: 'Valor errado',
    });
    expect(receipt.remaining).toBe('47.00');
  });

  it('remarcar a previsão (sem senha) grava o passo com o antes e o depois', async () => {
    const { payments, fiado } = buildFiado();
    expect(
      await payments.reschedule(CAIXA, 1, { dueDate: '2026-09-30' }),
    ).toEqual({ orderId: 1, dueDate: '2026-09-30' });
    await payments.reschedule(CAIXA, 1, { dueDate: null });
    expect(fiado.orders[0].dueDate).toBeNull();
    expect(fiado.events.map((e) => e.details)).toEqual([
      { kind: 'FIADO_DUE_DATE', from: null, to: '2026-09-30' },
      { kind: 'FIADO_DUE_DATE', from: '2026-09-30', to: null },
    ]);
  });

  it('remarcar para antes da noite do pedido é recusado', async () => {
    const { payments } = buildFiado();
    await expect(
      payments.reschedule(CAIXA, 1, { dueDate: '2026-09-19' }),
    ).rejects.toThrow(/antes da noite do pedido 2026-09-20/);
  });
});
