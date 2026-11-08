import { BadRequestException } from '@nestjs/common';
import { toBusinessDate } from '../closing/business-date.js';
import { fromMilli, toMilli } from '../common/quantity.js';
import type { StockMovementKind } from '../generated/prisma/client.js';

export interface RawStockMovementRecord {
  id: number;
  supplyId: number;
  lotId: number;
  kind: StockMovementKind;
  quantity: string;
  orderId: number | null;
  staffConsumptionId: number | null;
  createdById: number;
  createdByName: string;
  createdAt: Date;
  order: {
    dayNumber: number;
    businessDate: string;
  } | null;
  staffConsumption: {
    consumerName: string;
  } | null;
}

export interface GroupedStockMovement {
  id: number;
  supplyId: number;
  kind: StockMovementKind;
  quantityMilli: number;
  orderId: number | null;
  staffConsumptionId: number | null;
  createdById: number;
  createdByName: string;
  createdAt: Date;
  order: {
    dayNumber: number;
    businessDate: string;
  } | null;
  staffConsumption: {
    consumerName: string;
  } | null;
}

export interface StockMovementTotals {
  entered: string;
  sold: string;
  adjusted: string;
}

export interface SupplyMovementItem {
  id: number;
  kind: StockMovementKind;
  kindLabel: string;
  quantity: string;
  balanceAfter: string;
  origin: string | null;
  createdByName: string;
  createdAt: string;
}

export interface SupplyMovementsReport {
  supply: {
    id: number;
    name: string;
    countUnit: string;
  };
  totals: StockMovementTotals;
  movements: SupplyMovementItem[];
}

export interface StockMovementsQuery {
  from?: string;
  to?: string;
  kind?: StockMovementKind;
}

const VALID_KINDS: readonly StockMovementKind[] = [
  'ENTRY',
  'COUNT',
  'REVERSAL',
  'SALE',
  'SALE_RETURN',
];

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** Converte quantidade com sinal ('-3', '2.5') para milésimos inteiros. */
export function signedMilliOf(quantity: string): number {
  const isNegative = quantity.startsWith('-');
  const unsigned = isNegative ? quantity.slice(1) : quantity;
  const milli = toMilli(unsigned);
  return isNegative ? -milli : milli;
}

/** Formata milésimos inteiros em texto com até 3 casas decimais e sinal negativo se < 0. */
export function signedQuantityFromMilli(milli: number): string {
  if (milli === 0) return '0';
  const abs = Math.abs(milli);
  const formatted = fromMilli(abs);
  return milli < 0 ? `-${formatted}` : formatted;
}

/** Nome amigável em português do tipo de movimento para a interface. */
export function kindToPortuguese(kind: StockMovementKind): string {
  switch (kind) {
    case 'ENTRY':
      return 'Entrada';
    case 'COUNT':
      return 'Contagem';
    case 'REVERSAL':
      return 'Estorno';
    case 'SALE':
      return 'Venda';
    case 'SALE_RETURN':
      return 'Devolução';
  }
}

function operationGroupKey(row: RawStockMovementRecord): string {
  return [
    row.supplyId,
    row.kind,
    row.orderId ?? 'null',
    row.staffConsumptionId ?? 'null',
    row.createdById,
    row.createdAt.toISOString(),
  ].join(':');
}

/**
 * Agrupa movimentações geradas pela mesma operação (mesmo insumo, tipo, pedido/consumo,
 * autor e instante `createdAt`), somando as quantidades de lotes diferentes.
 *
 * @example groupMovementsByOperation(rows)
 */
export function groupMovementsByOperation(
  rows: RawStockMovementRecord[],
): GroupedStockMovement[] {
  const groups: GroupedStockMovement[] = [];
  const map = new Map<string, GroupedStockMovement>();
  for (const row of rows) {
    const key = operationGroupKey(row);
    const existing = map.get(key);
    if (existing) {
      existing.quantityMilli += signedMilliOf(row.quantity);
      continue;
    }
    const created: GroupedStockMovement = {
      id: row.id,
      supplyId: row.supplyId,
      kind: row.kind,
      quantityMilli: signedMilliOf(row.quantity),
      orderId: row.orderId,
      staffConsumptionId: row.staffConsumptionId,
      createdById: row.createdById,
      createdByName: row.createdByName,
      createdAt: row.createdAt,
      order: row.order,
      staffConsumption: row.staffConsumption,
    };
    map.set(key, created);
    groups.push(created);
  }
  return groups;
}

function formatOrderOrigin(order: {
  dayNumber: number;
  businessDate: string;
}): string {
  const day = order.businessDate.slice(8, 10);
  const month = order.businessDate.slice(5, 7);
  return `Pedido #${order.dayNumber} de ${day}/${month}`;
}

/**
 * Rótulo descritivo da origem do movimento (pedido, consumo ou contagem antes → depois).
 *
 * @example originLabelOf(op, 8000, 6000) // 'Contagem 8 → 6'
 */
export function originLabelOf(
  op: GroupedStockMovement,
  balanceBeforeMilli: number,
  balanceAfterMilli: number,
): string | null {
  if (op.kind === 'COUNT') {
    const before = signedQuantityFromMilli(balanceBeforeMilli);
    const after = signedQuantityFromMilli(balanceAfterMilli);
    return `Contagem ${before} → ${after}`;
  }
  if (op.order) return formatOrderOrigin(op.order);
  if (op.orderId !== null) return `Pedido #${op.orderId}`;
  if (op.staffConsumption)
    return `Consumo — ${op.staffConsumption.consumerName}`;
  if (op.staffConsumptionId !== null) return 'Consumo interno';
  return null;
}

/**
 * Calcula o saldo acumulado de todo o histórico do insumo até cada operação.
 *
 * @example buildMovementHistory(groupedOperations)
 */
export function buildMovementHistory(
  grouped: GroupedStockMovement[],
): SupplyMovementItem[] {
  let runningBalanceMilli = 0;
  return grouped.map((op) => {
    const balanceBeforeMilli = runningBalanceMilli;
    runningBalanceMilli += op.quantityMilli;
    return {
      id: op.id,
      kind: op.kind,
      kindLabel: kindToPortuguese(op.kind),
      quantity: signedQuantityFromMilli(op.quantityMilli),
      balanceAfter: signedQuantityFromMilli(runningBalanceMilli),
      origin: originLabelOf(op, balanceBeforeMilli, runningBalanceMilli),
      createdByName: op.createdByName,
      createdAt: op.createdAt.toISOString(),
    };
  });
}

function isInPeriod(
  createdAt: Date,
  period: { from?: string; to?: string },
  timeZone: string,
): boolean {
  const dateKey = toBusinessDate(createdAt, timeZone);
  if (period.from && dateKey < period.from) return false;
  if (period.to && dateKey > period.to) return false;
  return true;
}

/**
 * Totalizadores do período: entrou (entradas − estornos), vendeu (vendas − devoluções) e
 * ajustou (saldo das contagens).
 *
 * @example calculatePeriodTotals(grouped, { from: '2026-09-01', to: '2026-09-30' }, 'America/Sao_Paulo')
 */
export function calculatePeriodTotals(
  grouped: GroupedStockMovement[],
  period: { from?: string; to?: string },
  timeZone: string,
): StockMovementTotals {
  let enteredMilli = 0;
  let soldMilli = 0;
  let adjustedMilli = 0;
  for (const op of grouped) {
    if (!isInPeriod(op.createdAt, period, timeZone)) continue;
    if (op.kind === 'ENTRY' || op.kind === 'REVERSAL')
      enteredMilli += op.quantityMilli;
    if (op.kind === 'SALE' || op.kind === 'SALE_RETURN')
      soldMilli -= op.quantityMilli;
    if (op.kind === 'COUNT') adjustedMilli += op.quantityMilli;
  }
  return {
    entered: signedQuantityFromMilli(enteredMilli),
    sold: signedQuantityFromMilli(soldMilli),
    adjusted: signedQuantityFromMilli(adjustedMilli),
  };
}

/**
 * Filtra as movimentações por período e tipo, devolvendo as mais recentes primeiro.
 *
 * @example filterMovements(items, grouped, { kind: 'ENTRY' }, 'America/Sao_Paulo')
 */
export function filterMovements(
  items: SupplyMovementItem[],
  grouped: GroupedStockMovement[],
  query: StockMovementsQuery,
  timeZone: string,
): SupplyMovementItem[] {
  const filtered: SupplyMovementItem[] = [];
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const op = grouped[i];
    if (!isInPeriod(op.createdAt, query, timeZone)) continue;
    if (query.kind && item.kind !== query.kind) continue;
    filtered.push(item);
  }
  return filtered.reverse();
}

function parseOptionalDateParam(
  raw: unknown,
  name: string,
): string | undefined {
  if (raw === undefined || raw === '') return undefined;
  if (typeof raw !== 'string') {
    throw new BadRequestException(
      `Parâmetro "${name}" inválido: recebido ${JSON.stringify(raw)}, esperado data no formato YYYY-MM-DD (ex.: 2026-09-22)`,
    );
  }
  const parsed = new Date(`${raw}T00:00:00Z`);
  if (
    !ISO_DATE_PATTERN.test(raw) ||
    Number.isNaN(parsed.getTime()) ||
    parsed.toISOString().slice(0, 10) !== raw
  ) {
    throw new BadRequestException(
      `Parâmetro "${name}" inválido: recebido "${raw}", esperado data no formato YYYY-MM-DD (ex.: 2026-09-22)`,
    );
  }
  return raw;
}

function parseOptionalKindParam(raw: unknown): StockMovementKind | undefined {
  if (raw === undefined || raw === '') return undefined;
  if (
    typeof raw === 'string' &&
    (VALID_KINDS as readonly string[]).includes(raw)
  ) {
    return raw as StockMovementKind;
  }
  throw new BadRequestException(
    `Tipo de movimento inválido: recebido ${JSON.stringify(raw)}, esperado um de ${VALID_KINDS.join(', ')}`,
  );
}

/**
 * Valida parâmetros de consulta de movimentações de um insumo.
 *
 * @example parseMovementsQuery({ from: '2026-09-01', kind: 'ENTRY' })
 */
export function parseMovementsQuery(raw: {
  from?: unknown;
  to?: unknown;
  kind?: unknown;
}): StockMovementsQuery {
  const from = parseOptionalDateParam(raw.from, 'from');
  const to = parseOptionalDateParam(raw.to, 'to');
  if (from && to && from > to) {
    throw new BadRequestException(
      `Intervalo de datas inválido: "from" (${from}) é posterior a "to" (${to}); esperado from <= to`,
    );
  }
  const kind = parseOptionalKindParam(raw.kind);
  return { from, to, kind };
}

/**
 * Monta o relatório completo de movimentações de um insumo com agrupamento por operação,
 * saldo acumulado de todo o histórico, totalizadores do período e lista filtrada.
 *
 * @example buildSupplyMovementsReport(source, { from: '2026-09-01' }, 'America/Sao_Paulo')
 */
export function buildSupplyMovementsReport(
  source: {
    supply: { id: number; name: string; countUnit: string };
    movements: RawStockMovementRecord[];
  },
  query: StockMovementsQuery,
  timeZone: string,
): SupplyMovementsReport {
  const grouped = groupMovementsByOperation(source.movements);
  const items = buildMovementHistory(grouped);
  const totals = calculatePeriodTotals(grouped, query, timeZone);
  const movements = filterMovements(items, grouped, query, timeZone);
  return {
    supply: source.supply,
    totals,
    movements,
  };
}
