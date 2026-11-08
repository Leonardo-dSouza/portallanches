import { costKeysIn } from '../auth/cost-keys.fixture.js';
import type { SessionUser } from '../auth/session-user.js';
import type { EntryRecord, LotRecord } from './stock-repository.js';
import { StockController } from './stock.controller.js';
import type { StockService } from './stock.service.js';
import type { SupplyMovementsReport } from './supply-movements.js';

const ADMIN: SessionUser = { id: 1, name: 'admin', role: 'ADMIN' };
const CAIXA: SessionUser = { id: 2, name: 'caixa', role: 'CAIXA' };

const ENTRY: EntryRecord = {
  lotId: 4,
  supplyId: 7,
  supplyName: 'Coca Cola 600ml',
  countUnit: 'un',
  quantity: '12',
  remaining: '12',
  expiresOn: null,
  unitCost: '4.1667',
  createdByName: 'caixa',
  createdAt: '2026-10-25T20:00:00.000Z',
  reversedAt: null,
  reversible: true,
};

const LOT: LotRecord = {
  id: 4,
  supplyId: 7,
  quantity: '12',
  expiresOn: null,
  createdById: 2,
  unitCost: '4.1667',
};

/** As entradas e os lotes que o controller repassa. */
class RecordedEntries {
  async listEntries(): Promise<EntryRecord[]> {
    return [ENTRY];
  }

  async addEntries(): Promise<LotRecord[]> {
    return [LOT];
  }

  async listMovements(
    supplyId: number,
    _query: { from?: string; to?: string; kind?: string },
  ): Promise<SupplyMovementsReport> {
    return {
      supply: { id: supplyId, name: 'Coca Cola 600ml', countUnit: 'un' },
      totals: { entered: '12', sold: '2', adjusted: '0' },
      movements: [
        {
          id: 1,
          kind: 'ENTRY',
          kindLabel: 'Entrada',
          quantity: '12',
          balanceAfter: '12',
          origin: null,
          createdByName: 'admin',
          createdAt: '2026-10-25T20:00:00.000Z',
        },
      ],
    };
  }
}

const controller = new StockController(
  new RecordedEntries() as unknown as StockService,
);

// Regressão de 2026-10-25: o histórico de entradas levava o custo de cada uma ao caixa.
describe('StockController sem custo para o caixa', () => {
  it('histórico e entrada nova saem sem o custo para o caixa', async () => {
    const entries = await controller.listEntries(CAIXA);
    const lots = await controller.addEntries(CAIXA, { items: [] });
    expect(entries[0]).toMatchObject({
      lotId: 4,
      supplyName: 'Coca Cola 600ml',
    });
    expect(costKeysIn([entries, lots])).toEqual([]);
  });

  it('o admin vê o custo da entrada', async () => {
    expect(await controller.listEntries(ADMIN)).toEqual([ENTRY]);
    expect(await controller.addEntries(ADMIN, { items: [] })).toEqual([LOT]);
  });

  it('movimentações do insumo saem sem nenhum custo tanto para caixa quanto admin', async () => {
    const report = await controller.listMovements(
      7,
      '2026-10-01',
      '2026-10-31',
      'ENTRY',
    );
    expect(report.supply.id).toBe(7);
    expect(report.totals.entered).toBe('12');
    expect(report.movements[0].kindLabel).toBe('Entrada');
    expect(costKeysIn([report])).toEqual([]);
  });
});
