import type { Prisma } from '../generated/prisma/client.js';
import { nestItems, type StoredItem } from './order-item-tree.js';
import type { OrderEntry, OrderLine, OrderRemoval } from './order-pricing.js';

type Tx = Prisma.TransactionClient;
// Linha do pedido ou do consumo interno: as duas tabelas têm o mesmo formato, só muda o dono.
type ItemRow = Omit<Prisma.OrderItemGetPayload<object>, 'orderId'>;

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
  // A coluna JSON só recebe o que `priceOrderEntries` montou.
  removals: item.removals as OrderRemoval[],
});

/**
 * Linhas do banco (em ordem de id) em árvore: item com observação e adicionais.
 *
 * @example toEntries(row.items)[0].addons
 */
export function toEntries(rows: ItemRow[]): OrderEntry[] {
  return nestItems(rows.map(toStored));
}

/** Item pronto para o `create` do Prisma, com a chave do dono nele e nos adicionais. */
export type NestedItemData<Owner> = OrderLine &
  Owner & {
    note: string | null;
    addons: { create: (OrderLine & Owner)[] };
  };

/**
 * Dados de gravação de um item com os adicionais como linhas filhas; o dono (pedido ou consumo)
 * já existe, então todas levam a chave dele.
 *
 * @example nestedItemData(entry, { orderId: 7 }).addons.create[0].orderId // 7
 */
export function nestedItemData<Owner extends Record<string, number>>(
  { addons, ...line }: OrderEntry,
  owner: Owner,
): NestedItemData<Owner> {
  const children = addons.map((addon) => ({ ...addon, ...owner }));
  return { ...line, ...owner, addons: { create: children } };
}

/**
 * Grava as linhas do pedido: cada item com os adicionais como linhas filhas.
 *
 * @example await writeItems(tx, order.id, entries);
 */
export async function writeItems(
  tx: Tx,
  orderId: number,
  entries: OrderEntry[],
): Promise<void> {
  for (const entry of entries)
    await tx.orderItem.create({ data: nestedItemData(entry, { orderId }) });
}
