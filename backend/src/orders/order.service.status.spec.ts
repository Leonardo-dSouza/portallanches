import {
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

  it('apagar o último pedido não faz o próximo repetir o número (a comanda já saiu)', async () => {
    const { service } = build();
    await service.create(CAIXA, COUNTER);
    const second = await service.create(CAIXA, COUNTER);
    await service.remove(CAIXA, second.id);
    expect((await service.create(CAIXA, COUNTER)).dayNumber).toBe(3);
  });

  it('editar mantém o status; a entrega que "Saiu" e vira balcão volta para Em preparo', async () => {
    const { service, statuses } = build();
    const created = await service.create(CAIXA, DELIVERY);
    await statuses.advance(CAIXA, created.id);
    const asCounter = await service.replace(CAIXA, created.id, COUNTER);
    expect(asCounter.status).toBe('PREPARING');
    await statuses.advance(CAIXA, created.id);
    const edited = await service.replace(CAIXA, created.id, COUNTER);
    expect(edited).toMatchObject({ status: 'DELIVERED', live: true });
  });
});

describe('OrderStatusService', () => {
  it('avança e volta um passo no fluxo do tipo', async () => {
    const { service, statuses } = build();
    const { id } = await service.create(CAIXA, DELIVERY);
    expect((await statuses.advance(CAIXA, id)).status).toBe('OUT_FOR_DELIVERY');
    expect((await statuses.advance(CAIXA, id)).status).toBe('DELIVERED');
    expect((await statuses.revert(CAIXA, id)).status).toBe('OUT_FOR_DELIVERY');
  });

  it('nas pontas recusa com 409 e o status atual na mensagem', async () => {
    const { service, statuses } = build();
    const { id } = await service.create(CAIXA, COUNTER);
    await expect(statuses.revert(CAIXA, id)).rejects.toThrow(
      new ConflictException(
        `Pedido ${id} já está em PREPARING: esperado um status com anterior`,
      ),
    );
  });

  it('pedido importado da planilha (sem tipo) não tem status para mudar', async () => {
    const { service, statuses, orders } = build();
    const { id } = await service.create(CAIXA, COUNTER);
    orders.records[0].type = null;
    await expect(statuses.advance(CAIXA, id)).rejects.toThrow(
      UnprocessableEntityException,
    );
  });

  it('dia fechado: o caixa não muda o status', async () => {
    const { service, statuses, closings } = build();
    const { id } = await service.create(CAIXA, COUNTER);
    closings.today = { ...closings.today, status: 'CLOSED' };
    await expect(statuses.advance(CAIXA, id)).rejects.toThrow(
      ForbiddenException,
    );
  });
});
