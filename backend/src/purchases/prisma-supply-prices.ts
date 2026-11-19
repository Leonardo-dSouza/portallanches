import { baseUnitCostOn } from '../costs/base-on-date.js';
import { vendorDisplayName } from '../expenses/vendor-display.js';
import type { PrismaClient } from '../generated/prisma/client.js';
import { paidUnitCost, priceAlert } from './price-alert.js';
import { buildHistoryMap } from './prisma-invoice-rows.js';
import type {
  SupplyLastPricesMap,
  SupplyPriceRow,
} from './purchase-records.js';

type RawLink = {
  vendorId: number;
  code: string;
  supplyId: number;
  label: string | null;
  productName: string | null;
  baseQuantity: { toString(): string };
  supply: { unitCost: { toString(): string } | null };
};

type RawItem = {
  description: string;
  quantity: { toString(): string };
  unit: string;
  unitPrice: { toString(): string };
  code: string;
  invoice: {
    id: number;
    issuedAt: Date;
    vendorId: number;
    vendor: { nickname: string | null; legalName: string };
  };
};

function toSupplyPriceRow(
  item: RawItem,
  link: RawLink,
  baseCost: string | null,
): SupplyPriceRow {
  const alert = priceAlert(
    item.unitPrice.toString(),
    link.baseQuantity.toString(),
    baseCost,
  );
  return {
    invoiceId: item.invoice.id,
    issuedAt: item.invoice.issuedAt.toISOString(),
    vendorName: vendorDisplayName(item.invoice.vendor),
    productName: link.productName ?? item.description,
    description: item.description,
    quantity: item.quantity.toString(),
    unit: item.unit,
    unitPrice: item.unitPrice.toString(),
    label: link.label,
    baseQuantity: link.baseQuantity.toString(),
    paidPerUnit:
      alert?.paidPerUnit ??
      paidUnitCost(item.unitPrice.toString(), link.baseQuantity.toString()),
    // Sem base na data não há comparação: base e diferença nulas, nunca um zero que parece preço.
    basePerUnit: alert?.basePerUnit ?? null,
    diffPercent: alert?.diffPercent ?? null,
    above: alert?.above ?? false,
  };
}

/**
 * Lista todas as compras ligadas ao insumo, mais nova primeiro.
 *
 * @example await listSupplyPrices(prisma, 10)
 */
export async function listSupplyPrices(
  prisma: PrismaClient,
  supplyId: number,
): Promise<SupplyPriceRow[]> {
  const links = await prisma.vendorItemLink.findMany({
    where: { supplyId },
    include: { supply: { select: { unitCost: true } } },
  });
  if (links.length === 0) return [];
  const historyRows = await prisma.supplyCostHistory.findMany({
    where: { supplyId },
    orderBy: { changeSet: { createdAt: 'asc' } },
    select: {
      supplyId: true,
      oldUnitCost: true,
      newUnitCost: true,
      changeSet: { select: { createdAt: true } },
    },
  });
  const history = buildHistoryMap(historyRows).get(supplyId) ?? [];
  const currentCost = links[0]?.supply.unitCost?.toString() ?? null;
  const linkByKey = new Map(links.map((l) => [`${l.vendorId}|${l.code}`, l]));
  const items = await prisma.purchaseInvoiceItem.findMany({
    where: {
      outsideBusiness: false,
      invoice: { expense: { canceledAt: null } },
      OR: links.map((l) => ({
        code: l.code,
        invoice: { vendorId: l.vendorId, expense: { canceledAt: null } },
      })),
    },
    orderBy: [
      { invoice: { issuedAt: 'desc' } },
      { invoiceId: 'desc' },
      { position: 'asc' },
    ],
    select: {
      description: true,
      quantity: true,
      unit: true,
      unitPrice: true,
      code: true,
      invoice: {
        select: {
          id: true,
          issuedAt: true,
          vendorId: true,
          vendor: { select: { legalName: true, nickname: true } },
        },
      },
    },
  });
  return items.map((item) => {
    const link = linkByKey.get(`${item.invoice.vendorId}|${item.code}`)!;
    const baseCost = baseUnitCostOn(
      history,
      currentCost,
      item.invoice.issuedAt,
    );
    return toSupplyPriceRow(item, link as RawLink, baseCost);
  });
}

/**
 * Lista a compra ligada mais recente de cada insumo (para a área Custos). Sem N+1.
 *
 * @example await listLastPrices(prisma)
 */
export async function listLastPrices(
  prisma: PrismaClient,
): Promise<SupplyLastPricesMap> {
  const links = await prisma.vendorItemLink.findMany({
    select: {
      vendorId: true,
      code: true,
      supplyId: true,
      baseQuantity: true,
      label: true,
      productName: true,
      supply: { select: { unitCost: true } },
    },
  });
  if (links.length === 0) return {};
  const linkByKey = new Map(links.map((l) => [`${l.vendorId}|${l.code}`, l]));
  const items = await prisma.purchaseInvoiceItem.findMany({
    where: {
      outsideBusiness: false,
      invoice: { expense: { canceledAt: null } },
      OR: links.map((l) => ({
        code: l.code,
        invoice: { vendorId: l.vendorId, expense: { canceledAt: null } },
      })),
    },
    orderBy: [{ invoice: { issuedAt: 'desc' } }, { invoiceId: 'desc' }],
    select: {
      code: true,
      description: true,
      quantity: true,
      unit: true,
      unitPrice: true,
      invoice: {
        select: {
          id: true,
          issuedAt: true,
          vendorId: true,
          vendor: { select: { legalName: true, nickname: true } },
        },
      },
    },
  });
  const latestBySupply = new Map<number, { item: RawItem; link: RawLink }>();
  for (const item of items) {
    const link = linkByKey.get(`${item.invoice.vendorId}|${item.code}`);
    if (!link || latestBySupply.has(link.supplyId)) continue;
    latestBySupply.set(link.supplyId, { item, link: link as RawLink });
  }
  if (latestBySupply.size === 0) return {};
  const supplyIds = [...latestBySupply.keys()];
  const historyRows = await prisma.supplyCostHistory.findMany({
    where: { supplyId: { in: supplyIds } },
    orderBy: { changeSet: { createdAt: 'asc' } },
    select: {
      supplyId: true,
      oldUnitCost: true,
      newUnitCost: true,
      changeSet: { select: { createdAt: true } },
    },
  });
  const histories = buildHistoryMap(historyRows);
  const result: SupplyLastPricesMap = {};
  for (const [supplyId, { item, link }] of latestBySupply) {
    const history = histories.get(supplyId) ?? [];
    const currentCost = link.supply.unitCost?.toString() ?? null;
    const baseCost = baseUnitCostOn(
      history,
      currentCost,
      item.invoice.issuedAt,
    );
    const alert = priceAlert(
      item.unitPrice.toString(),
      link.baseQuantity.toString(),
      baseCost,
    );
    result[supplyId] = {
      issuedAt: item.invoice.issuedAt.toISOString(),
      vendorName: vendorDisplayName(item.invoice.vendor),
      paidPerUnit:
        alert?.paidPerUnit ??
        paidUnitCost(item.unitPrice.toString(), link.baseQuantity.toString()),
      diffPercent: alert?.diffPercent ?? null,
      above: alert?.above ?? false,
    };
  }
  return result;
}
