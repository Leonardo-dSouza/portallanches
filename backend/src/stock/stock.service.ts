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
import { unitCostFromPaid } from './entry-cost.js';
import { assertReversible } from './entry-reversal.js';
import { planCount } from './fefo.js';
import {
  parseStockCountInput,
  parseStockEntryBatch,
  type StockEntryInput,
} from './stock-input.js';
import {
  STOCK_REPOSITORY,
  type EntryRecord,
  type EntrySupply,
  type LotRecord,
  type NewLot,
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
    return snapshots.map((snapshot) =>
      buildStockItem(snapshot, today, this.timeZone),
    );
  }

  /**
   * Lança a compra inteira numa transação. "2 fardos" vira 12 un pela embalagem do
   * insumo; com valor pago, o custo do insumo passa a ser o último custo pago.
   *
   * @example await service.addEntries(user, { items: [{ supplyId: 3, amount: 2, packageName: 'fardo', paid: 50 }] })
   */
  async addEntries(user: SessionUser, body: unknown): Promise<LotRecord[]> {
    const items = parseStockEntryBatch(body);
    const supplies = await this.findActiveSupplies(
      items.map((i) => i.supplyId),
    );
    const lots = items.map((item) =>
      buildLot(item, supplies.get(item.supplyId)!, user.id),
    );
    return this.stock.addLots(lots);
  }

  /** @example await service.listEntries({ days: '30' }) */
  async listEntries(query: { days?: string }): Promise<EntryRecord[]> {
    const days = parseHistoryDays(query.days);
    const since = new Date(this.clock().getTime() - days * DAY_MS);
    return this.stock.listEntries(since);
  }

  /**
   * Desfaz uma entrada lançada errado, se nada mexeu no lote depois dela.
   *
   * @example await service.reverseEntry(user, 42)
   */
  async reverseEntry(user: SessionUser, lotId: number): Promise<void> {
    const found = await this.stock.reverseLot(lotId, user.id, assertReversible);
    if (!found) throw new NotFoundException(`Entrada ${lotId} não encontrada`);
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

  /** Por id; todos precisam existir e estar ativos, senão nada é gravado. */
  private async findActiveSupplies(
    ids: number[],
  ): Promise<Map<number, EntrySupply>> {
    const found = await this.stock.findEntrySupplies([...new Set(ids)]);
    const byId = new Map(found.map((supply) => [supply.id, supply]));
    const missing = ids.find((id) => !byId.has(id));
    if (missing !== undefined)
      throw new NotFoundException(`Insumo ${missing} não encontrado`);
    const inactive = found.find((supply) => !supply.active);
    if (inactive)
      throw new BadRequestException(
        `Insumo "${inactive.name}" (${inactive.id}) está inativo: reative em Cadastros → Insumos antes de lançar entrada`,
      );
    return byId;
  }
}

const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_HISTORY_DAYS = 30;
const MAX_HISTORY_DAYS = 90;

function parseHistoryDays(raw: string | undefined): number {
  if (raw === undefined) return DEFAULT_HISTORY_DAYS;
  const days = Number(raw);
  if (Number.isInteger(days) && days >= 1 && days <= MAX_HISTORY_DAYS)
    return days;
  throw new BadRequestException(
    `Parâmetro "days" inválido: recebido ${raw}, esperado de 1 a ${MAX_HISTORY_DAYS}`,
  );
}

function buildLot(
  item: StockEntryInput,
  supply: EntrySupply,
  createdById: number,
): NewLot {
  const quantity = convertToCountUnit(item, supply);
  return {
    supplyId: supply.id,
    quantity,
    expiresOn: item.expiresOn,
    createdById,
    unitCost: unitCostOf(item, supply, quantity),
  };
}

/**
 * Valor pago pela linha (÷ quantidade convertida) ou por unidade digitada (÷ tamanho da
 * embalagem; sem embalagem a unidade digitada já é a de contagem).
 */
function unitCostOf(
  item: StockEntryInput,
  supply: EntrySupply,
  quantity: string,
): string | null {
  if (item.paid === null) return null;
  if (item.paidPer === 'total') return unitCostFromPaid(item.paid, quantity);
  const pack = supply.packages.find((p) => p.name === item.packageName);
  return unitCostFromPaid(item.paid, pack?.quantity ?? '1');
}

function convertToCountUnit(
  input: StockEntryInput,
  supply: EntrySupply,
): string {
  if (input.packageName === null) return input.amount;
  const found = supply.packages.find((p) => p.name === input.packageName);
  if (!found)
    throw new BadRequestException(
      `Embalagem "${input.packageName}" não existe no insumo "${supply.name}" (${supply.id}): esperado uma de ${JSON.stringify(supply.packages.map((p) => p.name))}`,
    );
  const quantity = multiplyQuantities(input.amount, found.quantity);
  if (quantity !== null) return quantity;
  throw new BadRequestException(
    `Quantidade ${input.amount} × ${found.quantity} passa de 3 casas decimais: esperado resultado com até 3 casas`,
  );
}
