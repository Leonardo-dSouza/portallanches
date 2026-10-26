import {
  BadRequestException,
  ConflictException,
  UnprocessableEntityException,
} from '@nestjs/common';
import {
  build,
  CAIXA,
  COUNTER,
  DELIVERY,
  TWO_X_SALADA,
} from './order-fakes.fixture.js';

/** Balcão fiado da Maria (cliente 7, só nome e telefone), forma 4 = Fiado. */
const MARIA_FIADO = {
  items: TWO_X_SALADA,
  type: 'COUNTER',
  paymentMethodId: 4,
  customerId: 7,
};

// Fiado (pedido do usuário, 2026-10-25): cliente no balcão, previsão e as travas.
describe('OrderService com fiado', () => {
  it('entrega para cliente sem endereço (do balcão) é recusada citando o cliente', async () => {
    const created = build().service.create(CAIXA, {
      ...DELIVERY,
      customerId: 7,
    });
    await expect(created).rejects.toThrow(UnprocessableEntityException);
    await expect(created).rejects.toThrow(
      'Cliente 7 sem endereço: entrega precisa de rua e bairro',
    );
  });

  it('balcão fiado copia nome e telefone do cliente, sem bairro e com taxa 0', async () => {
    const order = await build().service.create(CAIXA, {
      ...MARIA_FIADO,
      fiadoDueDate: '2026-09-25',
    });
    expect(order).toMatchObject({
      customerId: 7,
      customerName: 'Maria',
      customerPhone: '79988881111',
      customerStreet: null,
      deliveryZoneId: null,
      deliveryFee: '0.00',
      fiadoDueDate: '2026-09-25',
      fiado: {
        dueDate: '2026-09-25',
        paidTotal: '0.00',
        remaining: '35.60',
        customerOpenTotal: '35.60',
      },
    });
  });

  it('balcão com cliente cadastrado (sem fiado) também copia o nome dele', async () => {
    const order = await build().service.create(CAIXA, {
      ...COUNTER,
      customerId: 5,
    });
    expect(order).toMatchObject({
      customerName: 'Ana',
      customerStreet: null,
      deliveryZoneId: null,
      fiado: null,
    });
  });

  it('fiado sem cliente e previsão antes da noite do pedido são recusados', async () => {
    const { service } = build();
    await expect(
      service.create(CAIXA, { ...COUNTER, paymentMethodId: 4 }),
    ).rejects.toThrow(BadRequestException);
    await expect(
      service.create(CAIXA, { ...MARIA_FIADO, fiadoDueDate: '2026-09-21' }),
    ).rejects.toThrow(/antes da noite do pedido 2026-09-22/);
  });

  it('a lista traz o bloco fiado com o total do cliente em todos os fiados', async () => {
    const { service, orders } = build();
    const first = await service.create(CAIXA, MARIA_FIADO);
    await service.create(CAIXA, COUNTER);
    await service.create(CAIXA, MARIA_FIADO);
    orders.fiadoPaid.set(first.id, '10.00');
    const listed = await service.listFor(CAIXA);
    expect(listed.map((order) => order.fiado?.remaining ?? null)).toEqual([
      '25.60',
      null,
      '35.60',
    ]);
    expect(listed[2].fiado?.customerOpenTotal).toBe('61.20');
  });

  it('editar pedido fiado com recebimento ativo é 409 com o valor', async () => {
    const { service, orders } = build();
    const created = await service.create(CAIXA, MARIA_FIADO);
    orders.fiadoPaid.set(created.id, '20.00');
    const edit = service.replace(CAIXA, created.id, MARIA_FIADO);
    await expect(edit).rejects.toThrow(ConflictException);
    await expect(edit).rejects.toThrow(/#1 tem 20.00 recebido de fiado/);
  });

  it('sem recebimento, o fiado edita na noite até para outra forma (a previsão sai)', async () => {
    const { service } = build();
    const created = await service.create(CAIXA, {
      ...MARIA_FIADO,
      fiadoDueDate: '2026-09-25',
    });
    const edited = await service.replace(CAIXA, created.id, {
      ...COUNTER,
      paymentMethodId: null,
      counterName: 'Maria',
    });
    expect(edited).toMatchObject({
      paymentMethodId: null,
      customerId: null,
      fiadoDueDate: null,
      fiado: null,
    });
  });

  it('cancelar pedido fiado com recebimento ativo é 409; sem recebimento cancela', async () => {
    const { service, cancels, orders } = build();
    const paid = await service.create(CAIXA, MARIA_FIADO);
    const unpaid = await service.create(CAIXA, MARIA_FIADO);
    orders.fiadoPaid.set(paid.id, '5.00');
    const reason = { reason: 'Lançado errado' };
    await expect(cancels.cancel(CAIXA, paid.id, reason)).rejects.toThrow(
      /#1 tem 5.00 recebido de fiado/,
    );
    const canceled = await cancels.cancel(CAIXA, unpaid.id, reason);
    expect(canceled.canceledAt).not.toBeNull();
  });
});
