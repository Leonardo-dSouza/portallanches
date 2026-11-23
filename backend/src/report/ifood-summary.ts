import { formatCents, toCents } from '../common/money.js';
import type { ReportOrderRow } from './report-source.js';

/**
 * O iFood à parte (2026-11-23): o cliente quer ver o canal isolado das vendas e do faturamento,
 * porque a comissão é alta e o líquido fica bem abaixo do bruto. Comissão e líquido são
 * estimativas pela comissão copiada em cada pedido; o valor certo vem no repasse do iFood.
 */
export interface IfoodSummary {
  count: number;
  /** Soma dos pedidos pelo preço do app. */
  gross: string;
  commission: string;
  net: string;
}

type IfoodRow = Pick<ReportOrderRow, 'amount' | 'ifoodCommissionPercent'>;

/** Comissão de um pedido em centavos, arredondada por pedido (o percentual tem até 2 casas). */
function commissionCents(row: IfoodRow): number {
  const basisPoints = Math.round(Number(row.ifoodCommissionPercent ?? 0) * 100);
  return Math.round((toCents(row.amount) * basisPoints) / 10000);
}

/**
 * Pedidos do iFood de fora das vendas e só eles: separa um lado do outro.
 *
 * @example splitIfood(orders).ifood.length // 1
 */
export function splitIfood<T extends Pick<ReportOrderRow, 'type'>>(
  orders: T[],
): { store: T[]; ifood: T[] } {
  return {
    store: orders.filter((o) => o.type !== 'IFOOD'),
    ifood: orders.filter((o) => o.type === 'IFOOD'),
  };
}

/**
 * Bruto, comissão e líquido estimados dos pedidos do iFood (não cancelados).
 *
 * @example ifoodSummary([{ amount: '49.80', ifoodCommissionPercent: '28.00' }]) // { count: 1, gross: '49.80', commission: '13.94', net: '35.86' }
 */
export function ifoodSummary(orders: IfoodRow[]): IfoodSummary {
  const gross = orders.reduce((sum, o) => sum + toCents(o.amount), 0);
  const commission = orders.reduce((sum, o) => sum + commissionCents(o), 0);
  return {
    count: orders.length,
    gross: formatCents(gross),
    commission: formatCents(commission),
    net: formatCents(gross - commission),
  };
}
