import { fromMilli, toMilli } from '../common/quantity.js';
import type { Prisma } from '../generated/prisma/client.js';
import { settleOversales } from './oversale.js';
import { takeSaleFromLot } from './prisma-sale-stock.js';

type Tx = Prisma.TransactionClient;

interface EntryLot {
  lotId: number;
  supplyId: number;
  quantityMilli: number;
  userId: number;
}

/**
 * A entrada desconta as vendas que passaram do saldo (decisão do usuário, 2026-10-09): cada
 * pendência vira a baixa do pedido no lote novo (editar/apagar o pedido devolve a esse lote).
 *
 * @example await settleOversalesWithEntry(tx, { lotId: 14, supplyId: 30, quantityMilli: 12000, userId: 1 });
 */
export async function settleOversalesWithEntry(
  tx: Tx,
  entry: EntryLot,
): Promise<void> {
  const { supplyId, userId } = entry;
  const rows = await tx.stockOversale.findMany({
    where: { supplyId },
    orderBy: { id: 'asc' },
    select: { id: true, orderId: true, quantity: true },
  });
  const pending = rows.map((r) => ({
    ...r,
    milli: toMilli(r.quantity.toString()),
  }));
  for (const cover of settleOversales(pending, entry.quantityMilli)) {
    const sale = { orderId: cover.orderId, userId, supplyId };
    await takeSaleFromLot(tx, sale, { lotId: entry.lotId, milli: cover.milli });
    await (cover.leftMilli === 0
      ? tx.stockOversale.delete({ where: { id: cover.id } })
      : tx.stockOversale.update({
          where: { id: cover.id },
          data: { quantity: fromMilli(cover.leftMilli) },
        }));
  }
}
