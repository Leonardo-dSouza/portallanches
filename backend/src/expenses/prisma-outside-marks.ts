import type { Prisma } from '../generated/prisma/client.js';

/**
 * Troca as marcas dos itens de uma nota (2026-10-25): tudo da lanchonete, depois as posições de
 * fora. Usada pelo gasto (Caixa) e por Compras, sempre dentro da transação de quem chama.
 *
 * @example await replaceOutsideMarks(tx, { invoiceId: 12 }, [9, 10])
 */
export async function replaceOutsideMarks(
  tx: Prisma.TransactionClient,
  items: Prisma.PurchaseInvoiceItemWhereInput,
  positions: number[],
): Promise<void> {
  await tx.purchaseInvoiceItem.updateMany({
    where: items,
    data: { outsideBusiness: false },
  });
  await tx.purchaseInvoiceItem.updateMany({
    where: { ...items, position: { in: positions } },
    data: { outsideBusiness: true },
  });
}
