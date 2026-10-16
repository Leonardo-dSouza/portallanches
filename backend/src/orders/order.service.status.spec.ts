import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  UnprocessableEntityException,
} from '@nestjs/common';
import {
  build,
  CAIXA,
  COUNTER,
  DELIVERY,
  EVENING,
} from './order-fakes.fixture.js';

/** O status que a lista mostrava (2026-10-15: o passo só vale a partir dele). */
const PREPARING = { from: 'PREPARING' };

/** 25/09, 20h: o caixa de 22/09 já é um caixa atrasado. */
const THREE_DAYS_LATER = new Date('2026-09-25T23:00:00Z');

describe('OrderService: número do dia e status (comanda impressa, 2026-10-10)', () => {
  it('na noite em andamento o pedido nasce Em preparo e a resposta diz que é ao vivo', async () => {
    const saved = await build(EVENING).service.create(CAIXA, COUNTER);
    expect(saved).toMatchObject({ status: 'PREPARING', live: true });
  });

  it('no caixa atrasado nasce Entregue e não é ao vivo', async () => {
    const saved = await build(THREE_DAYS_LATER).service.create(CAIXA, COUNTER);
    expect(saved).toMatchObject({ status: 'DELIVERED', live: false });
  });

  it('o número do dia segue a sequência do fechamento', async () => {
    const { service } = build();
    await service.create(CAIXA, COUNTER);
    const second = await service.create(CAIXA, COUNTER);
    expect(second.dayNumber).toBe(2);
  });

  it('cancelar o último pedido não faz o próximo repetir o número (a comanda já saiu)', async () => {
    const { service, cancels } = build();
    await service.create(CAIXA, COUNTER);
    const second = await service.create(CAIXA, COUNTER);
    await cancels.cancel(CAIXA, second.id, { reason: 'Pedido duplicado' });
    expect((await service.create(CAIXA, COUNTER)).dayNumber).toBe(3);
  });

  it('editar mantém o status; a entrega que "Saiu" e vira balcão volta para Em preparo', async () => {
    const { service, statuses } = build();
    const created = await service.create(CAIXA, DELIVERY);
    await statuses.advance(CAIXA, created.id, PREPARING);
    // Virar balcão tira a taxa (o valor baixa) de um pedido que já saiu: pede a senha do admin.
    const asCounter = await service.replace(CAIXA, created.id, {
      ...COUNTER,
      managerPassword: 'admin123',
    });
    expect(asCounter.status).toBe('PREPARING');
    await statuses.advance(CAIXA, created.id, PREPARING);
    const edited = await service.replace(CAIXA, created.id, COUNTER);
    expect(edited).toMatchObject({ status: 'DELIVERED', live: true });
  });
});

describe('OrderStatusService', () => {
  it('avança e volta um passo no fluxo do tipo', async () => {
    const { service, statuses } = build();
    const { id } = await service.create(CAIXA, DELIVERY);
    const out = await statuses.advance(CAIXA, id, PREPARING);
    expect(out.status).toBe('OUT_FOR_DELIVERY');
    const done = await statuses.advance(CAIXA, id, {
      from: 'OUT_FOR_DELIVERY',
    });
    expect(done.status).toBe('DELIVERED');
    const back = await statuses.revert(CAIXA, id, { from: 'DELIVERED' });
    expect(back.status).toBe('OUT_FOR_DELIVERY');
  });

  it('nas pontas recusa com 409 e o status atual na mensagem', async () => {
    const { service, statuses } = build();
    const { id } = await service.create(CAIXA, COUNTER);
    await expect(statuses.revert(CAIXA, id, PREPARING)).rejects.toThrow(
      new ConflictException(
        `Pedido ${id} já está em PREPARING: esperado um status com anterior`,
      ),
    );
  });

  it('pedido importado da planilha (sem tipo) não tem status para mudar', async () => {
    const { service, statuses, orders } = build();
    const { id } = await service.create(CAIXA, COUNTER);
    orders.records[0].type = null;
    await expect(statuses.advance(CAIXA, id, PREPARING)).rejects.toThrow(
      UnprocessableEntityException,
    );
  });

  it('clique duplo: o 2º chega com o status de antes e é recusado (409), sem pular o Saiu', async () => {
    const { service, statuses, orders } = build();
    const { id } = await service.create(CAIXA, DELIVERY);
    await statuses.advance(CAIXA, id, PREPARING);
    await expect(statuses.advance(CAIXA, id, PREPARING)).rejects.toThrow(
      /#1 já está em OUT_FOR_DELIVERY, não em PREPARING/,
    );
    expect(orders.records[0].status).toBe('OUT_FOR_DELIVERY');
  });

  it('sem o status de origem é 400', async () => {
    const { service, statuses } = build();
    const { id } = await service.create(CAIXA, COUNTER);
    await expect(statuses.advance(CAIXA, id, {})).rejects.toThrow(
      BadRequestException,
    );
  });

  it('cada passo grava a hora da etapa e vai para o histórico', async () => {
    const later = new Date('2026-09-22T23:12:00Z');
    const { service, statuses, orders } = build(later);
    const { id } = await service.create(CAIXA, DELIVERY);
    const out = await statuses.advance(CAIXA, id, PREPARING);
    expect(out.statusChangedAt).toEqual(later);
    expect(orders.events.at(-1)).toMatchObject({
      details: { kind: 'STATUS', from: 'PREPARING', to: 'OUT_FOR_DELIVERY' },
    });
  });

  it('dia fechado: o caixa não muda o status', async () => {
    const { service, statuses, closings } = build();
    const { id } = await service.create(CAIXA, COUNTER);
    closings.today = { ...closings.today, status: 'CLOSED' };
    await expect(statuses.advance(CAIXA, id, PREPARING)).rejects.toThrow(
      ForbiddenException,
    );
  });
});
