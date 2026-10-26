import type { OrderFiado } from './order-fiado.js';
import type { OrderEntry, OrderLine } from './order-pricing.js';
import type { OrderRecord, OrderSaveResponse } from './order-repository.js';

/**
 * Linha como a tela recebe: sem o CMV da época (2026-10-25). O CMV fica gravado para a Análise,
 * mas nenhuma tela de pedido o usa, e o caixa não pode receber custo pela API.
 */
export type OrderLineView = Omit<OrderLine, 'unitCmv' | 'cmvComplete'>;

export interface OrderEntryView extends OrderLineView {
  note: string | null;
  addons: OrderLineView[];
}

/**
 * Pedido na API: os itens sem CMV e, no fiado (2026-10-25), a previsão, o recebido, o que falta e
 * quanto o cliente deve em todos os fiados; null nas outras formas.
 */
export interface OrderView extends Omit<OrderRecord, 'items'> {
  items: OrderEntryView[];
  fiado: OrderFiado | null;
}

export interface OrderSaveView extends Omit<OrderSaveResponse, 'items'> {
  items: OrderEntryView[];
  fiado: OrderFiado | null;
}

function lineView({
  unitCmv: _cmv,
  cmvComplete: _complete,
  ...line
}: OrderLine): OrderLineView {
  return line;
}

/**
 * Itens (e adicionais) sem o CMV; serve ao pedido e ao consumo interno.
 *
 * @example entryViews(order.items)[0].unitCmv // undefined
 */
export function entryViews(entries: OrderEntry[]): OrderEntryView[] {
  return entries.map((entry) => ({
    ...lineView(entry),
    note: entry.note,
    addons: entry.addons.map(lineView),
  }));
}

/** @example orderView(record).items // os itens sem `unitCmv`/`cmvComplete` */
export function orderView<T extends OrderRecord>(
  order: T,
): Omit<T, 'items'> & { items: OrderEntryView[] } {
  return { ...order, items: entryViews(order.items) };
}
