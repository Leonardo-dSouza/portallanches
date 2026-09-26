import { BadRequestException, NotFoundException } from '@nestjs/common';
import type { SessionUser } from '../auth/session-user.js';
import { fromMilli, toMilli } from '../common/quantity.js';
import type { LotBalance } from './fefo.js';
import type { StockCountItemInput } from './stock-input.js';
import type {
  CountPlanner,
  EntrySupply,
  LotRecord,
  NewLot,
  StockRepository,
} from './stock-repository.js';
import type { SupplySnapshot } from './stock-status.js';
import { StockService } from './stock.service.js';

const CAIXA: SessionUser = { id: 2, name: 'caixa', role: 'CAIXA' };

/** Estoque em memória: lotes com saldo e contagens gravadas, aplicando o planner real. */
class FakeStockRepository implements StockRepository {
  supplies: EntrySupply[] = [
    { id: 1, active: true, packages: [{ name: 'fardo', quantity: '6' }] },
    { id: 2, active: false, packages: [] },
  ];
  lots: (LotRecord & { remaining: string })[] = [];
  counts: StockCountItemInput[] = [];

  async listSnapshots(): Promise<SupplySnapshot[]> {
    return [
      {
        supplyId: 1,
        name: 'Refrigerante',
        countUnit: 'un',
        minStock: '6',
        lots: this.balances(1),
        lastCount: null,
        lastEntryAt: null,
      },
    ];
  }

  async findEntrySupply(id: number): Promise<EntrySupply | null> {
    return this.supplies.find((s) => s.id === id) ?? null;
  }

  async activeSupplyIds(ids: number[]): Promise<number[]> {
    return ids.filter((id) =>
      this.supplies.some((s) => s.id === id && s.active),
    );
  }

  async addLot(lot: NewLot): Promise<LotRecord> {
    const record = {
      ...lot,
      id: this.lots.length + 1,
      remaining: lot.quantity,
    };
    this.lots.push(record);
    return record;
  }

  async saveCounts(
    _userId: number,
    items: StockCountItemInput[],
    planner: CountPlanner,
  ): Promise<void> {
    for (const item of items) {
      this.counts.push(item);
      if (item.quantity !== null)
        this.apply(item.supplyId, planner, item.quantity);
    }
  }

  private apply(supplyId: number, planner: CountPlanner, quantity: string) {
    const plan = planner(this.balances(supplyId), toMilli(quantity));
    for (const take of plan.takes) {
      const lot = this.lots.find((l) => l.id === take.lotId)!;
      lot.remaining = fromMilli(toMilli(lot.remaining) - take.milli);
    }
  }

  private balances(supplyId: number): LotBalance[] {
    return this.lots
      .filter((l) => l.supplyId === supplyId)
      .map((l) => ({
        id: l.id,
        remainingMilli: toMilli(l.remaining),
        expiresOn: l.expiresOn,
      }));
  }
}

function build() {
  const stock = new FakeStockRepository();
  const clock = () => new Date('2026-09-26T01:30:00Z'); // 25/09 22h30 em Brasília
  return {
    service: new StockService(stock, clock, 'America/Sao_Paulo'),
    stock,
  };
}

describe('StockService', () => {
  it('entrada em fardos vira unidades de contagem', async () => {
    const { service } = build();
    const lot = await service.addEntry(CAIXA, {
      supplyId: 1,
      amount: 2,
      packageName: 'fardo',
      expiresOn: '2026-10-15',
    });
    expect(lot).toMatchObject({
      quantity: '12',
      expiresOn: '2026-10-15',
      createdById: 2,
    });
  });

  it('recusa embalagem desconhecida, insumo inativo e inexistente', async () => {
    const { service } = build();
    await expect(
      service.addEntry(CAIXA, { supplyId: 1, amount: 1, packageName: 'caixa' }),
    ).rejects.toThrow(/Embalagem "caixa"/);
    await expect(
      service.addEntry(CAIXA, { supplyId: 2, amount: 1 }),
    ).rejects.toThrow(/inativo/);
    await expect(
      service.addEntry(CAIXA, { supplyId: 9, amount: 1 }),
    ).rejects.toThrow(NotFoundException);
  });

  it('contagem sobrescreve o saldo tirando do lote que vence primeiro', async () => {
    const { service, stock } = build();
    await service.addEntry(CAIXA, {
      supplyId: 1,
      amount: 6,
      expiresOn: '2026-10-15',
    });
    await service.addEntry(CAIXA, {
      supplyId: 1,
      amount: 6,
      expiresOn: '2026-09-30',
    });
    await service.saveCounts(CAIXA, {
      items: [{ supplyId: 1, status: 'COUNTED', quantity: 8 }],
    });
    expect(stock.lots.map((l) => l.remaining)).toEqual(['6', '2']);
  });

  it('lista com a data de negócio no fuso da lanchonete', async () => {
    const { service } = build();
    await service.addEntry(CAIXA, {
      supplyId: 1,
      amount: 3,
      expiresOn: '2026-09-25',
    });
    const [item] = await service.list();
    // 22h30 do dia 25 em Brasília: vence hoje (alerta), ainda não vencido.
    expect(item.flags).toMatchObject({
      expired: false,
      expiringSoon: true,
      belowMin: true,
    });
  });

  it('contagem com insumo inativo não grava nada', async () => {
    const { service, stock } = build();
    await expect(
      service.saveCounts(CAIXA, {
        items: [
          { supplyId: 1, status: 'NOT_COUNTED' },
          { supplyId: 2, status: 'NEEDS_PURCHASE' },
        ],
      }),
    ).rejects.toThrow(BadRequestException);
    expect(stock.counts).toEqual([]);
  });
});
