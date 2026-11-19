import {
  baseUnitCostOn,
  type UnitCostHistoryPoint,
} from '../costs/base-on-date.js';
import { fromDbDate } from '../common/db-date.js';
import { vendorDisplayName } from '../expenses/vendor-display.js';
import type { Prisma } from '../generated/prisma/client.js';
import { priceAlert, type PriceAlert } from './price-alert.js';
import type {
  ItemSupplyLink,
  PurchaseInvoiceItemRow,
  PurchaseInvoiceRow,
} from './purchase-records.js';

export interface EnrichedLink {
  supplyId: number;
  supplyName: string;
  baseQuantity: string;
  label: string | null;
  productName: string | null;
  unitCost: string | null;
}

export type LinksByCode = Map<string, EnrichedLink>;
export type SupplyHistories = Map<number, UnitCostHistoryPoint[]>;

export interface RawInvoiceRow {
  id: number;
  expenseId: number;
  vendorId: number;
  number: number;
  series: number;
  issuedAt: Date;
  amountDue: Prisma.Decimal;
  stockEnteredAt: Date | null;
  stockEnteredBy: { name: string } | null;
  vendor: { nickname: string | null; legalName: string };
  expense: {
    amount: Prisma.Decimal;
    closing: { businessDate: Date };
  };
  items: {
    id: number;
    position: number;
    code: string;
    description: string;
    quantity: Prisma.Decimal;
    unit: string;
    unitPrice: Prisma.Decimal;
    total: Prisma.Decimal;
    outsideBusiness: boolean;
  }[];
}

/** Mapeia links de itens por chave `vendorId|code`. */
export function buildLinksMap(
  links: {
    vendorId: number;
    code: string;
    baseQuantity: Prisma.Decimal;
    label: string | null;
    productName: string | null;
    supply: { id: number; name: string; unitCost: Prisma.Decimal | null };
  }[],
): LinksByCode {
  const map: LinksByCode = new Map();
  for (const link of links) {
    map.set(`${link.vendorId}|${link.code}`, {
      supplyId: link.supply.id,
      supplyName: link.supply.name,
      baseQuantity: link.baseQuantity.toString(),
      label: link.label,
      productName: link.productName,
      unitCost: link.supply.unitCost ? link.supply.unitCost.toString() : null,
    });
  }
  return map;
}

/** Mapeia histórico de custo unitário por supplyId em ordem cronológica. */
export function buildHistoryMap(
  histories: {
    supplyId: number;
    oldUnitCost: Prisma.Decimal | null;
    newUnitCost: Prisma.Decimal | null;
    changeSet: { createdAt: Date };
  }[],
): SupplyHistories {
  const map: SupplyHistories = new Map();
  for (const h of histories) {
    const list = map.get(h.supplyId) ?? [];
    list.push({
      createdAt: h.changeSet.createdAt,
      oldUnitCost: h.oldUnitCost ? h.oldUnitCost.toString() : null,
      newUnitCost: h.newUnitCost ? h.newUnitCost.toString() : null,
    });
    map.set(h.supplyId, list);
  }
  return map;
}

function buildItemAlert(
  item: { unitPrice: Prisma.Decimal; outsideBusiness: boolean },
  issuedAt: Date,
  link: EnrichedLink | null,
  histories: SupplyHistories,
): PriceAlert | null {
  if (item.outsideBusiness || !link) return null;
  const history = histories.get(link.supplyId) ?? [];
  const baseCost = baseUnitCostOn(history, link.unitCost, issuedAt);
  return priceAlert(item.unitPrice.toString(), link.baseQuantity, baseCost);
}

function buildInvoiceItemRow(
  item: RawInvoiceRow['items'][number],
  vendorId: number,
  issuedAt: Date,
  links: LinksByCode,
  histories: SupplyHistories,
): PurchaseInvoiceItemRow {
  const linkData = links.get(`${vendorId}|${item.code}`) ?? null;
  const link: ItemSupplyLink | null = linkData
    ? {
        supplyId: linkData.supplyId,
        supplyName: linkData.supplyName,
        baseQuantity: linkData.baseQuantity,
        label: linkData.label,
        productName: linkData.productName,
      }
    : null;
  const alert = buildItemAlert(item, issuedAt, linkData, histories);
  return {
    id: item.id,
    position: item.position,
    code: item.code,
    description: item.description,
    quantity: item.quantity.toString(),
    unit: item.unit,
    unitPrice: item.unitPrice.toString(),
    total: item.total.toFixed(2),
    outsideBusiness: item.outsideBusiness,
    link,
    alert,
  };
}

/**
 * Converte a linha do banco na estrutura da tela de notas com alertas de preço e estoque.
 *
 * @example toInvoiceRowWithAlerts(row, links, histories)
 */
export function toInvoiceRowWithAlerts(
  row: RawInvoiceRow,
  links: LinksByCode,
  histories: SupplyHistories,
): PurchaseInvoiceRow {
  const items = row.items.map((item) =>
    buildInvoiceItemRow(item, row.vendorId, row.issuedAt, links, histories),
  );
  const outsideItemCount = items.filter((i) => i.outsideBusiness).length;
  const aboveBaseCount = items.filter(
    (i) => !i.outsideBusiness && i.alert?.above === true,
  ).length;
  return {
    id: row.id,
    expenseId: row.expenseId,
    vendorId: row.vendorId,
    vendorName: vendorDisplayName(row.vendor),
    number: row.number,
    series: row.series,
    issuedAt: row.issuedAt.toISOString(),
    itemCount: items.length,
    outsideItemCount,
    aboveBaseCount,
    amountDue: row.amountDue.toFixed(2),
    expenseAmount: row.expense.amount.toFixed(2),
    businessDate: fromDbDate(row.expense.closing.businessDate),
    stockEnteredAt: row.stockEnteredAt
      ? row.stockEnteredAt.toISOString()
      : null,
    stockEnteredByName: row.stockEnteredBy?.name ?? null,
    items,
  };
}
