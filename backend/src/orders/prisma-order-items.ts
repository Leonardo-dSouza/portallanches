import type { Prisma } from '../generated/prisma/client.js';
import { nestItems, type StoredItem } from './order-item-tree.js';
import type { OrderEntry } from './order-pricing.js';

type Tx = Prisma.TransactionClient;
type ItemRow = Prisma.OrderItemGetPayload<object>;

const toStored = (item: ItemRow): StoredItem => ({
  id: item.id,
  parentItemId: item.parentItemId,
  note: item.note,
  productId: item.productId,
  productName: item.productName,
  menuNumber: item.menuNumber,
  categoryName: item.categoryName,
  quantity: item.quantity,
  unitPrice: item.unitPrice.toFixed(2),
  unitCmv: item.unitCmv?.toFixed(2) ?? null,
  cmvComplete: item.cmvComplete,
});

/**
 * Linhas do banco (em ordem de id) em árvore: item com observação e adicionais.
 *
 * @example toEntries(row.items)[0].addons
 */
export function toEntries(rows: ItemRow[]): OrderEntry[] {
  return nestItems(rows.map(toStored));
}

/**
 * Grava as linhas do pedido: cada item com os adicionais como linhas filhas (o pedido já
 * existe, então todas levam o `orderId`).
 *
 * @example await writeItems(tx, order.id, entries);
 */
export async function writeItems(
  tx: Tx,
  orderId: number,
  entries: OrderEntry[],
): Promise<void> {
  for (const { addons, ...line } of entries) {
    const children = addons.map((addon) => ({ ...addon, orderId }));
    await tx.orderItem.create({
      data: { ...line, orderId, addons: { create: children } },
    });
  }
}
