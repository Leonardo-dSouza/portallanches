import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { SessionUser } from '../auth/session-user.js';
import { toBusinessDate } from '../closing/business-date.js';
import { BUSINESS_TIMEZONE, CLOCK, type Clock } from '../common/clock.js';
import { multiplyQuantities } from '../common/quantity.js';
import { planCount } from './fefo.js';
import {
  parseStockCountInput,
  parseStockEntryInput,
  type StockEntryInput,
} from './stock-input.js';
import {
  STOCK_REPOSITORY,
  type EntrySupply,
  type LotRecord,
  type StockRepository,
} from './stock-repository.js';
import { buildStockItem, type StockItem } from './stock-status.js';

/**
 * Estoque por lotes. Nesta fase o saldo só muda por entrada (lote novo) e por contagem
 * com sobrescrita; a baixa por venda (Entregável 3) entra como outro tipo de movimento.
 */
@Injectable()
export class StockService {
  constructor(
    @Inject(STOCK_REPOSITORY) private readonly stock: StockRepository,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(BUSINESS_TIMEZONE) private readonly timeZone: string,
  ) {}

  /** @example (await service.list()).filter((item) => item.flags.belowMin) */
  async list(): Promise<StockItem[]> {
    const today = toBusinessDate(this.clock(), this.timeZone);
    const snapshots = await this.stock.listSnapshots();
    return snapshots.map((snapshot) => buildStockItem(snapshot, today));
  }

  /**
   * Lança um lote. "2 fardos" vira 12 un pela embalagem do insumo; sem embalagem, a
   * quantidade já está na unidade de contagem.
   *
   * @example await service.addEntry(user, { supplyId: 3, amount: 2, packageName: 'fardo' })
   */
  async addEntry(user: SessionUser, body: unknown): Promise<LotRecord> {
    const input = parseStockEntryInput(body);
    const supply = await this.findActiveSupply(input.supplyId);
    return this.stock.addLot({
      supplyId: supply.id,
      quantity: convertToCountUnit(input, supply),
      expiresOn: input.expiresOn,
      createdById: user.id,
    });
  }

  /** @example await service.saveCounts(user, { items: [{ supplyId: 3, status: 'COUNTED', quantity: 8 }] }) */
  async saveCounts(user: SessionUser, body: unknown): Promise<void> {
    const items = parseStockCountInput(body);
    const ids = items.map((item) => item.supplyId);
    const active = new Set(await this.stock.activeSupplyIds(ids));
    const unknown = ids.filter((id) => !active.has(id));
    if (unknown.length > 0)
      throw new BadRequestException(
        `Insumos inexistentes ou inativos na contagem: ${unknown.join(', ')}; esperado ids de insumos ativos`,
      );
    await this.stock.saveCounts(user.id, items, planCount);
  }

  private async findActiveSupply(id: number): Promise<EntrySupply> {
    const supply = await this.stock.findEntrySupply(id);
    if (!supply) throw new NotFoundException(`Insumo ${id} não encontrado`);
    if (supply.active) return supply;
    throw new BadRequestException(
      `Insumo ${id} está inativo: reative em Cadastros → Insumos antes de lançar entrada`,
    );
  }
}

function convertToCountUnit(
  input: StockEntryInput,
  supply: EntrySupply,
): string {
  if (input.packageName === null) return input.amount;
  const found = supply.packages.find((p) => p.name === input.packageName);
  if (!found)
    throw new BadRequestException(
      `Embalagem "${input.packageName}" não existe no insumo ${supply.id}: esperado uma de ${JSON.stringify(supply.packages.map((p) => p.name))}`,
    );
  const quantity = multiplyQuantities(input.amount, found.quantity);
  if (quantity !== null) return quantity;
  throw new BadRequestException(
    `Quantidade ${input.amount} × ${found.quantity} passa de 3 casas decimais: esperado resultado com até 3 casas`,
  );
}
