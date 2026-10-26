import { ConflictException } from '@nestjs/common';
import { formatCents, toCents } from '../common/money.js';
import type { OrderRecord } from './order-repository.js';

/**
 * Um pedido fiado como o banco dá (2026-10-25): o cliente, o valor e a soma dos recebimentos
 * não estornados. O que falta não fica gravado: é sempre o valor menos o recebido.
 */
export interface FiadoLedgerRow {
  orderId: number;
  customerId: number | null;
  amount: string;
  paid: string;
  canceled: boolean;
}

/** Quanto o pedido já recebeu, quanto falta e quanto o cliente deve em todos os fiados. */
export interface OrderFiadoBalance {
  paidTotal: string;
  remaining: string;
  customerOpenTotal: string;
}

/** O bloco `fiado` do pedido na API: a previsão e os valores. */
export interface OrderFiado extends OrderFiadoBalance {
  dueDate: string | null;
}

/** Um pedido (ou a resposta dele) com o bloco `fiado`; null quando a forma não é fiado. */
export type WithFiado<T> = T & { fiado: OrderFiado | null };

/** Quem lê o razão do fiado: os pedidos pedidos e os outros fiados em aberto dos mesmos clientes. */
export interface FiadoLedgerReader {
  listFiadoLedger(orderIds: number[]): Promise<FiadoLedgerRow[]>;
}

/**
 * O que falta no pedido, em centavos; o cancelado não deve nada.
 *
 * @example remainingCents({ amount: '47.00', paid: '20.00', canceled: false, … }) // 2700
 */
export function remainingCents(row: FiadoLedgerRow): number {
  if (row.canceled) return 0;
  return Math.max(0, toCents(row.amount) - toCents(row.paid));
}

function openTotalsByCustomer(ledger: FiadoLedgerRow[]): Map<number, number> {
  const totals = new Map<number, number>();
  for (const row of ledger) {
    if (row.customerId === null) continue;
    const before = totals.get(row.customerId) ?? 0;
    totals.set(row.customerId, before + remainingCents(row));
  }
  return totals;
}

/**
 * O saldo de cada pedido do razão, com o total em aberto do cliente dele.
 *
 * @example fiadoBalances(rows).get(5)?.remaining // '27.00'
 */
export function fiadoBalances(
  ledger: FiadoLedgerRow[],
): Map<number, OrderFiadoBalance> {
  const totals = openTotalsByCustomer(ledger);
  return new Map(
    ledger.map((row) => [
      row.orderId,
      {
        paidTotal: row.paid,
        remaining: formatCents(remainingCents(row)),
        customerOpenTotal: formatCents(totals.get(row.customerId ?? 0) ?? 0),
      },
    ]),
  );
}

/**
 * Os pedidos com o bloco `fiado` (null quando a forma não é fiado), numa leitura só para a
 * lista inteira.
 *
 * @example (await withFiado(orders, records))[0].fiado?.remaining // '47.00'
 */
export async function withFiado<T extends OrderRecord>(
  reader: FiadoLedgerReader,
  records: T[],
): Promise<WithFiado<T>[]> {
  if (records.length === 0) return [];
  const ledger = await reader.listFiadoLedger(records.map((r) => r.id));
  const balances = fiadoBalances(ledger);
  return records.map((record) => {
    const balance = balances.get(record.id);
    const fiado = balance ? { dueDate: record.fiadoDueDate, ...balance } : null;
    return { ...record, fiado };
  });
}

/**
 * Pedido fiado com recebimento ativo não muda (2026-10-25): editar ou cancelar mexeria num
 * dinheiro que já entrou na gaveta; é preciso estornar antes.
 *
 * @example await assertNoFiadoPayment(orders, order) // 409 se já recebeu algo
 */
export async function assertNoFiadoPayment(
  reader: FiadoLedgerReader,
  order: Pick<OrderRecord, 'id' | 'dayNumber'>,
): Promise<void> {
  const ledger = await reader.listFiadoLedger([order.id]);
  const own = ledger.find((row) => row.orderId === order.id);
  if (!own || toCents(own.paid) === 0) return;
  throw new ConflictException(
    `Pedido #${order.dayNumber} tem ${own.paid} recebido de fiado: esperado estornar os recebimentos antes de editar ou cancelar`,
  );
}
