import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { SessionUser } from '../auth/session-user.js';
import {
  CLOSING_LOOKUP,
  type ClosingLookup,
} from '../closing/closing-lookup.js';
import type { ClosingRecord } from '../closing/closing-repository.js';
import { isLiveNight } from '../closing/live-night.js';
import { BUSINESS_TIMEZONE, CLOCK, type Clock } from '../common/clock.js';
import { toNeighborhoodKey } from '../delivery/neighborhood-key.js';
import type { OrderEntry } from '../orders/order-pricing.js';
import {
  ORDER_CATALOG,
  type OrderCatalog,
} from '../orders/order-repository.js';
import type { SaleShortfall } from '../orders/order-stock.js';
import { priceItemsForDay } from '../orders/priced-items.js';
import { stockChangeFor, type SaleNeed } from '../orders/stock-needs.js';
import { consumptionCost, type ConsumptionCost } from './consumption-cost.js';
import {
  parseStaffConsumptionInput,
  type StaffConsumptionInput,
} from './staff-consumption-input.js';
import {
  STAFF_CONSUMPTION_REPOSITORY,
  type StaffConsumptionData,
  type StaffConsumptionRecord,
  type StaffConsumptionRepository,
} from './staff-consumption-repository.js';

/** Sugestões do "Para quem": nomes usados nos últimos 60 dias, no máximo 20. */
const NAME_SUGGESTION_DAYS = 60;
const NAME_SUGGESTION_LIMIT = 20;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Consumo como a tela mostra: sem a chave do nome e com o custo (CMV) somado. */
export type StaffConsumptionView = Omit<StaffConsumptionRecord, 'consumerKey'> &
  ConsumptionCost;

/** Resposta de lançar ou editar: o aviso de saldo e se o dia é a noite em andamento (imprime). */
export interface StaffConsumptionSaveResponse extends StaffConsumptionView {
  stockShortfalls: SaleShortfall[];
  live: boolean;
}

function toView({
  consumerKey: _key,
  ...record
}: StaffConsumptionRecord): StaffConsumptionView {
  return { ...record, ...consumptionCost(record.items) };
}

/**
 * Consumo interno do dia (pedido do usuário, 2026-10-20): itens do cardápio que a equipe consome,
 * com as regras do pedido (caixa só na noite em andamento, baixa só nela) e sem pagamento.
 */
@Injectable()
export class StaffConsumptionService {
  constructor(
    @Inject(STAFF_CONSUMPTION_REPOSITORY)
    private readonly consumptions: StaffConsumptionRepository,
    @Inject(ORDER_CATALOG) private readonly catalog: OrderCatalog,
    @Inject(CLOSING_LOOKUP) private readonly closings: ClosingLookup,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(BUSINESS_TIMEZONE) private readonly timeZone: string,
  ) {}

  /**
   * Lança o consumo no fechamento da data escolhida (padrão: hoje).
   *
   * @example await service.create(user, { consumerName: 'Bianca', items: [{ productId: 9, quantity: 1 }] });
   */
  async create(
    user: SessionUser,
    body: unknown,
    rawDate?: string,
  ): Promise<StaffConsumptionSaveResponse> {
    const input = parseStaffConsumptionInput(body);
    const closing = await this.closings.getOrCreateFor(user, rawDate);
    this.closings.assertEditable(user, closing);
    const live = this.isLive(closing);
    const { data, needs } = await this.resolve(input, closing, []);
    const stock = stockChangeFor(live, user.id, needs);
    const saved = await this.consumptions.create(
      closing.id,
      user.id,
      data,
      stock,
    );
    return { ...toView(saved), stockShortfalls: saved.stockShortfalls, live };
  }

  /** Troca quem e os itens; as linhas que já estavam mantêm o preço e o CMV da época. */
  async replace(
    user: SessionUser,
    id: number,
    body: unknown,
  ): Promise<StaffConsumptionSaveResponse> {
    const input = parseStaffConsumptionInput(body);
    const { record, closing } = await this.findEditable(user, id);
    const live = this.isLive(closing);
    const { data, needs } = await this.resolve(input, closing, record.items);
    const stock = stockChangeFor(live, user.id, needs);
    const saved = await this.consumptions.update(id, data, stock);
    return { ...toView(saved), stockShortfalls: saved.stockShortfalls, live };
  }

  /** Apaga sem senha (não mexe em dinheiro); na noite em andamento devolve o estoque. */
  async remove(user: SessionUser, id: number): Promise<void> {
    const { closing } = await this.findEditable(user, id);
    const stock = stockChangeFor(this.isLive(closing), user.id, []);
    await this.consumptions.delete(id, stock);
  }

  async listFor(
    user: SessionUser,
    rawDate?: string,
  ): Promise<StaffConsumptionView[]> {
    const closing = await this.closings.getFor(user, rawDate);
    const records = await this.consumptions.listByClosing(closing.id);
    return records.map(toView);
  }

  async listByDate(rawDate: string): Promise<StaffConsumptionView[]> {
    const closing = await this.closings.getByDate(rawDate);
    const records = await this.consumptions.listByClosing(closing.id);
    return records.map(toView);
  }

  /** Nomes para o "Para quem", o mais recente primeiro. */
  recentNames(): Promise<string[]> {
    const since = new Date(
      this.clock().getTime() - NAME_SUGGESTION_DAYS * DAY_MS,
    );
    return this.consumptions.recentNames(since, NAME_SUGGESTION_LIMIT);
  }

  private isLive(closing: ClosingRecord): boolean {
    return isLiveNight(closing.businessDate, this.clock(), this.timeZone);
  }

  private async resolve(
    input: StaffConsumptionInput,
    closing: ClosingRecord,
    previous: OrderEntry[],
  ): Promise<{ data: StaffConsumptionData; needs: SaleNeed[] }> {
    const { items, needs } = await priceItemsForDay(
      this.catalog,
      input.items,
      closing.businessDate,
      previous,
    );
    const { consumerName } = input;
    const consumerKey = toNeighborhoodKey(consumerName);
    return { data: { consumerName, consumerKey, items }, needs };
  }

  /** O consumo e o fechamento dele, se o usuário pode mexer naquele dia. */
  private async findEditable(
    user: SessionUser,
    id: number,
  ): Promise<{ record: StaffConsumptionRecord; closing: ClosingRecord }> {
    const record = await this.consumptions.findById(id);
    if (!record)
      throw new NotFoundException(`Consumo interno ${id} não encontrado`);
    const closing = await this.closings.getById(record.closingId);
    this.closings.assertEditable(user, closing);
    return { record, closing };
  }
}
