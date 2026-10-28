import { costKeysIn } from '../auth/cost-keys.fixture.js';
import {
  ADMIN,
  build,
  CAIXA,
  COUNTER,
  TWO_X_SALADA,
} from './order-fakes.fixture.js';
import { OrdersController } from './orders.controller.js';

function buildController() {
  const fakes = build();
  const controller = new OrdersController(
    fakes.service,
    fakes.statuses,
    fakes.cancels,
  );
  return { controller, ...fakes };
}

// Regressão de 2026-10-25: os itens do pedido levavam o CMV da época (`unitCmv`) ao caixa.
describe('OrdersController sem custo nos itens', () => {
  it('salvar, listar e mudar o status não mandam CMV', async () => {
    const { controller } = buildController();
    const saved = await controller.create(CAIXA, COUNTER);
    const listed = await controller.listFor(CAIXA);
    const advanced = await controller.advanceStatus(CAIXA, saved.id, {
      from: saved.status,
    });
    expect(saved.items).not.toHaveLength(0);
    expect(costKeysIn([saved, listed, advanced])).toEqual([]);
  });

  it('nem o admin recebe o CMV do pedido (nenhuma tela usa)', async () => {
    const { controller } = buildController();
    await controller.create(ADMIN, COUNTER);
    const listed = await controller.listFor(ADMIN);
    expect(listed[0].items[0]).toMatchObject({ productId: 9, quantity: 2 });
    expect(costKeysIn(listed)).toEqual([]);
  });
});

// Fiado (2026-10-25): o bloco novo do pedido também não leva custo ao caixa.
describe('OrdersController com fiado', () => {
  it('o caixa recebe o bloco fiado ao salvar, listar e mudar o status, sem custo', async () => {
    const { controller } = buildController();
    const fiado = { items: TWO_X_SALADA, type: 'COUNTER', paymentMethodId: 4 };
    const saved = await controller.create(CAIXA, { ...fiado, customerId: 7 });
    const listed = await controller.listFor(CAIXA);
    const advanced = await controller.advanceStatus(CAIXA, saved.id, {
      from: saved.status,
    });
    expect(saved.fiado).toMatchObject({ remaining: '35.60' });
    expect(listed[0].fiado?.customerOpenTotal).toBe('35.60');
    expect(advanced.fiado?.paidTotal).toBe('0.00');
    expect(costKeysIn([saved, listed, advanced])).toEqual([]);
  });

  it('o pedido pelo id (aba Fiado, 2026-10-27) chega ao caixa com os itens e sem custo', async () => {
    const { controller } = buildController();
    const fiado = { items: TWO_X_SALADA, type: 'COUNTER', paymentMethodId: 4 };
    const saved = await controller.create(CAIXA, { ...fiado, customerId: 7 });
    const found = await controller.findOne(CAIXA, saved.id);
    expect(found.items).not.toHaveLength(0);
    expect(found.fiado?.remaining).toBe('35.60');
    expect(costKeysIn(found)).toEqual([]);
  });
});
