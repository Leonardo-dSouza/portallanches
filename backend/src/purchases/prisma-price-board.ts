import { vendorDisplayName } from '../expenses/vendor-display.js';
import type { PrismaClient } from '../generated/prisma/client.js';
import { linkedItemKeys } from './linked-item-keys.js';
import type { IssuedRange, LinkedPurchase } from './purchase-records.js';

const LINK_SELECT = {
  vendorId: true,
  code: true,
  productName: true,
  baseQuantity: true,
  supply: { select: { id: true, name: true, countUnit: true } },
} as const;

const ITEM_SELECT = {
  code: true,
  description: true,
  position: true,
  unitPrice: true,
  total: true,
  invoice: {
    select: {
      id: true,
      issuedAt: true,
      vendorId: true,
      vendor: { select: { nickname: true, legalName: true } },
    },
  },
} as const;

type LinkRow = {
  vendorId: number;
  code: string;
  productName: string | null;
  baseQuantity: { toString(): string };
  supply: { id: number; name: string; countUnit: string };
};

type ItemRow = {
  code: string;
  description: string;
  position: number;
  unitPrice: { toString(): string };
  total: { toString(): string };
  invoice: {
    id: number;
    issuedAt: Date;
    vendorId: number;
    vendor: { nickname: string | null; legalName: string };
  };
};

function toLinkedPurchase(item: ItemRow, link: LinkRow): LinkedPurchase {
  return {
    supplyId: link.supply.id,
    supplyName: link.supply.name,
    countUnit: link.supply.countUnit,
    productName: link.productName ?? item.description,
    vendorId: item.invoice.vendorId,
    vendorName: vendorDisplayName(item.invoice.vendor),
    invoiceId: item.invoice.id,
    issuedAt: item.invoice.issuedAt,
    position: item.position,
    unitPrice: item.unitPrice.toString(),
    baseQuantity: link.baseQuantity.toString(),
    total: item.total.toString(),
  };
}

/**
 * Compras ligadas a insumo no período, para o quadro de preços: fora da lanchonete e nota de gasto
 * cancelado não entram (mesmos filtros do histórico do insumo).
 *
 * @example await listLinkedPurchases(prisma, { from, until })
 */
export async function listLinkedPurchases(
  prisma: PrismaClient,
  range: IssuedRange,
): Promise<LinkedPurchase[]> {
  const links = (await prisma.vendorItemLink.findMany({
    select: LINK_SELECT,
  })) as LinkRow[];
  if (links.length === 0) return [];
  const linkByKey = new Map(links.map((l) => [`${l.vendorId}|${l.code}`, l]));
  // 2026-11-23: um OR por ligação levava ~500 ms e ~200 MB no Postgres (teto de 768 MB na produção).
  // O IN é largo; o casamento fornecedor|código fica no flatMap abaixo.
  const { codes, vendorIds } = linkedItemKeys(links);
  const items = (await prisma.purchaseInvoiceItem.findMany({
    where: {
      outsideBusiness: false,
      code: { in: codes },
      invoice: {
        issuedAt: { gte: range.from, lt: range.until },
        vendorId: { in: vendorIds },
        expense: { canceledAt: null },
      },
    },
    select: ITEM_SELECT,
  })) as ItemRow[];
  return items.flatMap((item) => {
    const link = linkByKey.get(`${item.invoice.vendorId}|${item.code}`);
    return link ? [toLinkedPurchase(item, link)] : [];
  });
}
