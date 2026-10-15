import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import {
  ADMIN,
  build,
  CAIXA,
  COUNTER,
  DELIVERY,
  LAUNCHED_AT,
} from './order-fakes.fixture.js';

/** Minutos depois do lançamento do pedido dos fakes. */
const minutesLater = (minutes: number) =>
  new Date(LAUNCHED_AT.getTime() + minutes * 60_000);
const REASON = { reason: 'Cliente desistiu' };

describe('OrderCancelService: cancelar no lugar de apagar (2026-10-15)', () => {
  it('o caixa cancela sozinho em preparo e nos 15 min: fica com o motivo e vai para o histórico', async () => {
    const { service, cancels, orders, manager } = build(minutesLater(14));
    const created = await service.create(CAIXA, COUNTER);
    const canceled = await cancels.cancel(CAIXA, created.id, REASON);
    expect(canceled).toMatchObject({
      cancelReason: 'Cliente desistiu',
      canceledAt: minutesLater(14),
    });
    expect(manager.received).toEqual([]);
    expect(orders.events.at(-1)).toEqual({
      orderId: created.id,
      userId: CAIXA.id,
      managerAuthorized: false,
      details: { kind: 'CANCELED', reason: 'Cliente desistiu' },
    });
  });

  it('motivo vazio ou curto é recusado citando o recebido', async () => {
    const { service, cancels } = build();
    const created = await service.create(CAIXA, COUNTER);
    await expect(cancels.cancel(CAIXA, created.id, {})).rejects.toThrow(
      BadRequestException,
    );
    await expect(
      cancels.cancel(CAIXA, created.id, { reason: ' ok ' }),
    ).rejects.toThrow(/recebido " ok ", esperado texto de 3 a 200/);
  });

  it('fora dos 15 min o caixa precisa da senha do admin; com ela, o histórico marca', async () => {
    const { service, cancels, orders } = build(minutesLater(20));
    const created = await service.create(CAIXA, COUNTER);
    await expect(cancels.cancel(CAIXA, created.id, REASON)).rejects.toThrow(
      /MANAGER_REQUIRED/,
    );
    await expect(
      cancels.cancel(CAIXA, created.id, { ...REASON, managerPassword: 'x' }),
    ).rejects.toThrow(/MANAGER_DENIED/);
    expect(orders.records[0].canceledAt).toBeNull();
    await cancels.cancel(CAIXA, created.id, {
      ...REASON,
      managerPassword: 'admin123',
    });
    expect(orders.events.at(-1)?.managerAuthorized).toBe(true);
  });

  it('pedido que já saiu pede a senha mesmo no 1º minuto', async () => {
    const { service, statuses, cancels } = build(minutesLater(1));
    const created = await service.create(CAIXA, DELIVERY);
    await statuses.advance(CAIXA, created.id);
    await expect(cancels.cancel(CAIXA, created.id, REASON)).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('a trava em 0 min pede sempre; o admin logado nunca precisa', async () => {
    const { service, cancels, settings } = build();
    settings.cashierFixMinutes = 0;
    const first = await service.create(CAIXA, COUNTER);
    await expect(cancels.cancel(CAIXA, first.id, REASON)).rejects.toThrow(
      /MANAGER_REQUIRED/,
    );
    await expect(
      cancels.cancel(ADMIN, first.id, REASON),
    ).resolves.toBeDefined();
  });

  it('cancelado não cancela de novo, não edita e não muda de status (409)', async () => {
    const { service, statuses, cancels } = build();
    const created = await service.create(CAIXA, COUNTER);
    await cancels.cancel(CAIXA, created.id, REASON);
    await expect(cancels.cancel(CAIXA, created.id, REASON)).rejects.toThrow(
      /#1 está cancelado/,
    );
    await expect(service.replace(CAIXA, created.id, COUNTER)).rejects.toThrow(
      ConflictException,
    );
    await expect(statuses.advance(CAIXA, created.id)).rejects.toThrow(
      ConflictException,
    );
  });

  it('desfazer volta o pedido e grava no histórico; o que não está cancelado é 409', async () => {
    const { service, cancels, orders } = build();
    const created = await service.create(CAIXA, COUNTER);
    await expect(cancels.restore(ADMIN, created.id)).rejects.toThrow(
      /não está cancelado/,
    );
    await cancels.cancel(CAIXA, created.id, REASON);
    const restored = await cancels.restore(ADMIN, created.id);
    expect(restored).toMatchObject({ canceledAt: null, cancelReason: null });
    expect(orders.events.at(-1)?.details).toEqual({ kind: 'RESTORED' });
  });
});

describe('OrderCancelService: histórico do pedido', () => {
  it('lançado, alterado (antes e depois) e cancelado, na ordem', async () => {
    const { service, cancels } = build();
    const created = await service.create(CAIXA, COUNTER);
    await service.replace(CAIXA, created.id, {
      ...COUNTER,
      items: [{ productId: 9, quantity: 1 }],
      paymentMethodId: 3,
      paymentMode: 'PIX',
    });
    await cancels.cancel(CAIXA, created.id, REASON);
    const events = await cancels.listEvents(CAIXA, created.id);
    expect(events.map((event) => event.details)).toEqual([
      {
        kind: 'CREATED',
        order: {
          amount: '35.60',
          paymentMethodId: 1,
          paymentMode: null,
          items: '2× X Salada',
        },
      },
      {
        kind: 'EDITED',
        before: {
          amount: '35.60',
          paymentMethodId: 1,
          paymentMode: null,
          items: '2× X Salada',
        },
        after: {
          amount: '17.80',
          paymentMethodId: 3,
          paymentMode: 'PIX',
          items: '1× X Salada',
        },
      },
      { kind: 'CANCELED', reason: 'Cliente desistiu' },
    ]);
    expect(events[0].userRole).toBe('CAIXA');
  });

  it('o caixa não vê o histórico de pedido de dia passado (403); o admin vê', async () => {
    const { service, cancels, orders } = build();
    const created = await service.create(ADMIN, COUNTER);
    orders.records[0].closingId = 11; // fechamento de 2026-08-01
    await expect(cancels.listEvents(CAIXA, created.id)).rejects.toThrow(
      ForbiddenException,
    );
    await expect(cancels.listEvents(ADMIN, created.id)).resolves.toHaveLength(
      1,
    );
  });
});
