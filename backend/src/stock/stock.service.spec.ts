import {
  BadRequestException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import type { SessionUser } from '../auth/session-user.js';
import { fromMilli, toMilli } from '../common/quantity.js';
import type { ReversalCandidate } from './entry-reversal.js';
import type { LotBalance } from './fefo.js';
import type { StockCountItemInput } from './stock-input.js';
import type {
  CountPlanner,
  EntryRecord,
  EntrySupply,
  LotRecord,
  NewLot,
  ReversalCheck,
  StockRepository,
} from './stock-repository.js';
import type { SupplySnapshot } from './stock-status.js';
import { StockService } from './stock.service.js';

const CAIXA: SessionUser = { id: 2, name: 'caixa', role: 'CAIXA' };

/** Estoque em memória: lotes com saldo e contagens gravadas, aplicando o planner real. */
class FakeStockRepository implements StockRepository {
  supplies: EntrySupply[] = [
    {
      id: 1,
      name: 'Refrigerante',
      active: true,
      packages: [{ name: 'fardo', quantity: '6' }],
    },
    { id: 2, name: 'Calabresa', active: false, packages: [] },
  ];
  lots: (LotRecord & { remaining: string; reversed: boolean })[] = [];
  /** Custo do insumo depois das entradas (último custo pago). */
  supplyCosts = new Map<number, string>();
  historySince: Date | null = null;
  counts: StockCountItemInput[] = [];

  async listSnapshots(): Promise<SupplySnapshot[]> {
    return [
      {
        supplyId: 1,
        name: 'Refrigerante',
        sectionId: null,
        countUnit: 'un',
        minStock: '6',
        dailyCount: false,
        lots: this.balances(1),
        lastCount: null,
        lastEntryAt: null,
        oversoldMilli: 0,
      },
    ];
  }

  async findEntrySupplies(ids: number[]): Promise<EntrySupply[]> {
    return this.supplies.filter((s) => ids.includes(s.id));
  }

  async activeSupplyIds(ids: number[]): Promise<number[]> {
    return ids.filter((id) =>
      this.supplies.some((s) => s.id === id && s.active),
    );
  }

  async addLots(lots: NewLot[]): Promise<LotRecord[]> {
    return lots.map((lot) => {
      const record = {
        ...lot,
        id: this.lots.length + 1,
        remaining: lot.quantity,
        reversed: false,
      };
      this.lots.push(record);
      if (lot.unitCost !== null)
        this.supplyCosts.set(lot.supplyId, lot.unitCost);
      return record;
    });
  }

  async listEntries(since: Date): Promise<EntryRecord[]> {
    this.historySince = since;
    return [];
  }

  async reverseLot(
    lotId: number,
    _userId: number,
    check: ReversalCheck,
  ): Promise<boolean> {
    const lot = this.lots.find((l) => l.id === lotId);
    if (!lot) return false;
    check(this.candidateOf(lot));
    lot.remaining = '0';
    lot.reversed = true;
    return true;
  }

  private candidateOf(
    lot: LotRecord & { remaining: string; reversed: boolean },
  ): ReversalCandidate {
    const touched = lot.remaining !== lot.quantity;
    return {
      lotId: lot.id,
      supplyName: 'Refrigerante',
      quantity: lot.quantity,
      remaining: lot.remaining,
      reversedAt: lot.reversed ? new Date() : null,
      laterMovements: touched ? 1 : 0,
      isEntry: true,
    };
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
    const [lot] = await service.addEntries(CAIXA, {
      supplyId: 1,
      amount: 2,
      packageName: 'fardo',
      expiresOn: '2026-10-15',
    });
    expect(lot).toMatchObject({
      quantity: '12',
      expiresOn: '2026-10-15',
      createdById: 2,
      unitCost: null,
    });
  });

  it('compra inteira: valor da linha vira custo por unidade de contagem', async () => {
    const { service, stock } = build();
    const lots = await service.addEntries(CAIXA, {
      items: [
        { supplyId: 1, amount: 2, packageName: 'fardo', paid: 50 },
        {
          supplyId: 1,
          amount: 1,
          packageName: 'fardo',
          paid: 27,
          paidPer: 'unit',
        },
      ],
    });
    expect(lots.map((l) => l.unitCost)).toEqual(['4.1667', '4.5']);
    // O último custo pago vence.
    expect(stock.supplyCosts.get(1)).toBe('4.5');
  });

  it('um insumo inativo na compra recusa a compra inteira com o nome', async () => {
    const { service, stock } = build();
    await expect(
      service.addEntries(CAIXA, {
        items: [
          { supplyId: 1, amount: 1 },
          { supplyId: 2, amount: 1 },
        ],
      }),
    ).rejects.toThrow(/Insumo "Calabresa" \(2\) está inativo/);
    expect(stock.lots).toEqual([]);
  });

  it('histórico padrão de 30 dias e limite de 90', async () => {
    const { service, stock } = build();
    await service.listEntries({});
    expect(stock.historySince?.toISOString()).toBe('2026-08-27T01:30:00.000Z');
    await expect(service.listEntries({ days: '91' })).rejects.toThrow(
      /"days" inválido: recebido 91/,
    );
  });

  it('desfaz entrada intacta e recusa a que já foi contada', async () => {
    const { service, stock } = build();
    await service.addEntries(CAIXA, { supplyId: 1, amount: 6 });
    await service.addEntries(CAIXA, { supplyId: 1, amount: 6 });
    await service.reverseEntry(CAIXA, 1);
    expect(stock.lots[0]).toMatchObject({ remaining: '0', reversed: true });
    await service.saveCounts(CAIXA, {
      items: [{ supplyId: 1, status: 'COUNTED', quantity: 4 }],
    });
    await expect(service.reverseEntry(CAIXA, 2)).rejects.toThrow(
      UnprocessableEntityException,
    );
  });

  it('404 ao desfazer entrada inexistente', async () => {
    await expect(build().service.reverseEntry(CAIXA, 99)).rejects.toThrow(
      new NotFoundException('Entrada 99 não encontrada'),
    );
  });

  it('recusa embalagem desconhecida, insumo inativo e inexistente', async () => {
    const { service } = build();
    await expect(
      service.addEntries(CAIXA, {
        supplyId: 1,
        amount: 1,
        packageName: 'caixa',
      }),
    ).rejects.toThrow(/Embalagem "caixa"/);
    await expect(
      service.addEntries(CAIXA, { supplyId: 2, amount: 1 }),
    ).rejects.toThrow(/inativo/);
    await expect(
      service.addEntries(CAIXA, { supplyId: 9, amount: 1 }),
    ).rejects.toThrow(NotFoundException);
  });

  it('contagem sobrescreve o saldo tirando do lote que vence primeiro', async () => {
    const { service, stock } = build();
    await service.addEntries(CAIXA, {
      supplyId: 1,
      amount: 6,
      expiresOn: '2026-10-15',
    });
    await service.addEntries(CAIXA, {
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
    await service.addEntries(CAIXA, {
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
