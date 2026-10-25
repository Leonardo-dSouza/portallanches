import { costKeysIn } from '../auth/cost-keys.fixture.js';
import { ADMIN, CAIXA } from '../orders/order-fakes.fixture.js';
import { buildStaffConsumption } from './staff-consumption-fakes.fixture.js';
import { StaffConsumptionController } from './staff-consumption.controller.js';

const MOTOBOY = {
  consumerName: 'Motoboy',
  items: [{ productId: 9, quantity: 1 }],
};

function buildController() {
  const fakes = buildStaffConsumption();
  return {
    controller: new StaffConsumptionController(fakes.service),
    ...fakes,
  };
}

// Regressão de 2026-10-25: a tela escondia a coluna Custo, mas a API mandava o CMV ao caixa.
describe('StaffConsumptionController', () => {
  it('o caixa lança, edita e lista sem receber custo nenhum', async () => {
    const { controller } = buildController();
    const saved = await controller.create(CAIXA, MOTOBOY);
    const edited = await controller.replace(CAIXA, saved.id, MOTOBOY);
    const listed = await controller.listFor(CAIXA);
    expect(listed[0]).toMatchObject({ consumerName: 'Motoboy' });
    expect(listed[0].items[0]).toMatchObject({ productId: 9, quantity: 1 });
    expect(costKeysIn([saved, edited, listed])).toEqual([]);
  });

  it('o admin recebe o custo do lançamento, mas não o CMV de cada item', async () => {
    const { controller } = buildController();
    await controller.create(ADMIN, MOTOBOY, '2026-09-22');
    const [listed] = await controller.listByDate(ADMIN, '2026-09-22');
    expect(listed.cmvTotal).toMatch(/^\d+\.\d{2}$/);
    expect(listed.missingCostCount).toBe(0);
    expect(costKeysIn(listed.items)).toEqual([]);
  });
});
