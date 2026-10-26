import { costKeysIn } from '../auth/cost-keys.fixture.js';
import { CAIXA } from '../orders/order-fakes.fixture.js';
import { buildFiado } from './fiado-fakes.fixture.js';
import { FiadoController } from './fiado.controller.js';

function buildController() {
  const fakes = buildFiado();
  return {
    controller: new FiadoController(fakes.queries, fakes.payments),
    ...fakes,
  };
}

// Custo nunca vai para o CAIXA (2026-10-25): cada rota do fiado conferida.
describe('FiadoController', () => {
  it('as listas e o extrato chegam ao caixa sem campo de custo', async () => {
    const { controller, fiado } = buildController();
    fiado.orders[0].dueDate = '2026-09-21';
    const open = await controller.listOpen();
    const due = await controller.listDue(CAIXA);
    const statement = await controller.statement(7);
    expect(open).toHaveLength(1);
    expect(due).toHaveLength(1);
    expect(statement.openOrders).toHaveLength(1);
    expect(costKeysIn([open, due, statement])).toEqual([]);
  });

  it('receber, estornar e remarcar respondem ao caixa sem campo de custo', async () => {
    const { controller } = buildController();
    const received = await controller.receive(CAIXA, 1, {
      amount: 20,
      extra: 5,
      paymentMethodId: 1,
    });
    const canceled = await controller.cancel(CAIXA, received.payment.id, {
      reason: 'Valor errado',
    });
    const moved = await controller.reschedule(CAIXA, 1, {
      dueDate: '2026-09-30',
    });
    expect(received.remaining).toBe('27.00');
    expect(canceled.remaining).toBe('47.00');
    expect(moved.dueDate).toBe('2026-09-30');
    expect(costKeysIn([received, canceled, moved])).toEqual([]);
  });
});
