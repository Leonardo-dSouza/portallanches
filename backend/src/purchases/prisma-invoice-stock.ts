import { ConflictException } from '@nestjs/common';
import type { PrismaClient } from '../generated/prisma/client.js';
import { createEntryLot } from '../stock/prisma-stock.repository.js';
import type { LotRecord, NewLot } from '../stock/stock-repository.js';
import type { LinkedInvoiceItem } from './invoice-stock-entry.js';
import type { InvoiceStockTarget } from './purchase-records.js';

type RawInvoiceItem = {
  id: number;
  code: string;
  quantity: { toString(): string };
  unitPrice: { toString(): string };
  outsideBusiness: boolean;
};

type RawLink = {
  code: string;
  supplyId: number;
  baseQuantity: { toString(): string };
  supply: { deductOnSale: boolean };
};

function toLinkedItem(
  item: RawInvoiceItem,
  invoiceId: number,
  linksByCode: Map<string, RawLink>,
): LinkedInvoiceItem {
  const link = linksByCode.get(item.code);
  return {
    id: item.id,
    invoiceId,
    quantity: item.quantity.toString(),
    unitPrice: item.unitPrice.toString(),
    outsideBusiness: item.outsideBusiness,
    link: link
      ? {
          supplyId: link.supplyId,
          baseQuantity: link.baseQuantity.toString(),
          deductOnSale: link.supply.deductOnSale,
        }
      : null,
  };
}

/**
 * Busca os itens e ligações de uma nota fiscal para planejar a entrada no estoque.
 *
 * @example await findInvoiceStockTarget(prisma, 12)
 */
export async function findInvoiceStockTarget(
  prisma: PrismaClient,
  invoiceId: number,
): Promise<InvoiceStockTarget | null> {
  const row = await prisma.purchaseInvoice.findUnique({
    where: { id: invoiceId, expense: { canceledAt: null } },
    select: {
      id: true,
      issuedAt: true,
      stockEnteredAt: true,
      vendorId: true,
      items: {
        select: {
          id: true,
          code: true,
          quantity: true,
          unitPrice: true,
          outsideBusiness: true,
        },
      },
    },
  });
  if (!row) return null;
  const linkRows = await prisma.vendorItemLink.findMany({
    where: { vendorId: row.vendorId },
    select: {
      code: true,
      supplyId: true,
      baseQuantity: true,
      supply: { select: { deductOnSale: true } },
    },
  });
  const linksByCode = new Map(linkRows.map((l) => [l.code, l]));
  const items = row.items.map((i) => toLinkedItem(i, row.id, linksByCode));
  return {
    id: row.id,
    issuedAt: row.issuedAt,
    stockEnteredAt: row.stockEnteredAt,
    items,
  };
}

/**
 * Grava os lotes e marca a nota fiscal no estoque numa única transação atômica.
 *
 * @example await saveInvoiceStockEntry(prisma, 12, 1, lots)
 */
export async function saveInvoiceStockEntry(
  prisma: PrismaClient,
  invoiceId: number,
  userId: number,
  lots: NewLot[],
): Promise<LotRecord[]> {
  return prisma.$transaction(async (tx) => {
    const marked = await tx.purchaseInvoice.updateMany({
      where: { id: invoiceId, stockEnteredAt: null },
      data: {
        stockEnteredAt: new Date(),
        stockEnteredById: userId,
      },
    });
    if (marked.count === 0) {
      throw new ConflictException(
        `Nota fiscal ${invoiceId} já foi lançada no estoque`,
      );
    }
    const records: LotRecord[] = [];
    for (const lot of lots) records.push(await createEntryLot(tx, lot));
    return records;
  });
}
