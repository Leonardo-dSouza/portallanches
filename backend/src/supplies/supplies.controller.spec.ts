import { costKeysIn } from '../auth/cost-keys.fixture.js';
import type { SessionUser } from '../auth/session-user.js';
import { SuppliesController } from './supplies.controller.js';
import type { SupplyRecord } from './supply-repository.js';
import type { SupplyService } from './supply.service.js';

const ADMIN: SessionUser = { id: 1, name: 'admin', role: 'ADMIN' };
const CAIXA: SessionUser = { id: 2, name: 'caixa', role: 'CAIXA' };

const BACON: SupplyRecord = {
  id: 7,
  name: 'Bacon',
  countUnit: 'kg',
  minStock: null,
  unitCost: '19.90',
  deductOnSale: false,
  dailyCount: false,
  sectionId: null,
  active: true,
  packages: [],
  saleProduct: null,
};

/** Só a leitura da lista, que é o que o controller repassa. */
class ListedSupplies {
  async list(): Promise<SupplyRecord[]> {
    return [BACON];
  }
}

const controller = new SuppliesController(
  new ListedSupplies() as unknown as SupplyService,
);

// Regressão de 2026-10-25: o GET /supplies levava o custo de cada insumo ao caixa.
describe('SuppliesController', () => {
  it('o caixa recebe os insumos sem o custo', async () => {
    const [supply] = await controller.list(CAIXA);
    expect(supply).toMatchObject({ id: 7, name: 'Bacon', countUnit: 'kg' });
    expect(costKeysIn(supply)).toEqual([]);
  });

  it('o admin recebe o custo (Cadastros → Insumos)', async () => {
    expect(await controller.list(ADMIN)).toEqual([BACON]);
  });
});
