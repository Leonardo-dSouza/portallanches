import type { StockChange } from '../orders/order-repository.js';
import type { SaleShortfall } from '../orders/order-stock.js';
import {
  FakeClosingLookup,
  FakeOrderCatalog,
} from '../orders/order-fakes.fixture.js';
import { StaffConsumptionService } from './staff-consumption.service.js';
import type {
  SavedStaffConsumption,
  StaffConsumptionData,
  StaffConsumptionRecord,
  StaffConsumptionRepository,
} from './staff-consumption-repository.js';

// Apoio dos specs do StaffConsumptionService: o cardápio e os fechamentos são os fakes do pedido.

/** Instante fixo do lançamento nos fakes (20h de 22/09 em Brasília). */
export const CONSUMED_AT = new Date('2026-09-22T23:00:00Z');

/** Grava em memória e guarda cada baixa pedida ao estoque, na ordem. */
export class FakeStaffConsumptionRepository implements StaffConsumptionRepository {
  readonly records: StaffConsumptionRecord[] = [];
  readonly stockChanges: { id: number; stock: StockChange | null }[] = [];
  /** O que o estoque "não cobriu" na próxima gravação. */
  shortfalls: SaleShortfall[] = [];
  /** Respostas do `recentNames` e os argumentos recebidos. */
  names: string[] = [];
  readonly namesAsked: { since: Date; limit: number }[] = [];
  private nextId = 1;

  async create(
    closingId: number,
    createdById: number,
    data: StaffConsumptionData,
    stock: StockChange | null,
  ): Promise<SavedStaffConsumption> {
    const id = this.nextId++;
    const record = { ...data, id, closingId, createdById };
    this.records.push({ ...record, createdAt: CONSUMED_AT });
    return this.saved(id, stock);
  }

  async findById(id: number): Promise<StaffConsumptionRecord | null> {
    return this.records.find((r) => r.id === id) ?? null;
  }

  async update(
    id: number,
    data: StaffConsumptionData,
    stock: StockChange | null,
  ): Promise<SavedStaffConsumption> {
    const index = this.records.findIndex((r) => r.id === id);
    this.records[index] = { ...this.records[index], ...data };
    return this.saved(id, stock);
  }

  async delete(id: number, stock: StockChange | null): Promise<void> {
    this.stockChanges.push({ id, stock });
    const index = this.records.findIndex((r) => r.id === id);
    this.records.splice(index, 1);
  }

  async listByClosing(closingId: number): Promise<StaffConsumptionRecord[]> {
    return this.records.filter((r) => r.closingId === closingId);
  }

  async recentNames(since: Date, limit: number): Promise<string[]> {
    this.namesAsked.push({ since, limit });
    return this.names;
  }

  private saved(id: number, stock: StockChange | null): SavedStaffConsumption {
    this.stockChanges.push({ id, stock });
    const record = this.records.find((r) => r.id === id);
    if (!record) throw new Error(`Consumo ${id} não está no fake`);
    return { ...record, stockShortfalls: this.shortfalls };
  }
}

/** 20h de 22/09 em Brasília: a noite em andamento é a de 2026-09-22. */
export function buildStaffConsumption(now: Date = CONSUMED_AT) {
  const consumptions = new FakeStaffConsumptionRepository();
  const catalog = new FakeOrderCatalog();
  const closings = new FakeClosingLookup();
  const service = new StaffConsumptionService(
    consumptions,
    catalog,
    closings,
    () => now,
    'America/Sao_Paulo',
  );
  return { service, consumptions, catalog, closings };
}
