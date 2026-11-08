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
  isChoice: item.isChoice,
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

/** Linha filha: adicional ou a escolha obrigatória (o pão), marcada por `isChoice`. */
type ChildItemData<Owner> = OrderLine & Owner & { isChoice: boolean };

/** Item pronto para o `create` do Prisma, com a chave do dono nele e nas filhas. */
export type NestedItemData<Owner> = OrderLine &
  Owner & {
    note: string | null;
    addons: { create: ChildItemData<Owner>[] };
  };

/**
 * Dados de gravação de um item com a escolha e os adicionais como linhas filhas (a escolha
 * primeiro); o dono (pedido ou consumo) já existe, então todas levam a chave dele.
 *
 * @example nestedItemData(entry, { orderId: 7 }).addons.create[0].orderId // 7
 */
export function nestedItemData<Owner extends Record<string, number>>(
  { choice, addons, ...line }: OrderEntry,
  owner: Owner,
): NestedItemData<Owner> {
  const chosen = choice ? [{ ...choice, ...owner, isChoice: true }] : [];
  const extras = addons.map((addon) => ({
    ...addon,
    ...owner,
    isChoice: false,
  }));
  return { ...line, ...owner, addons: { create: [...chosen, ...extras] } };
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
