import {
  Inject,
  Injectable,
  UnprocessableEntityException,
} from '@nestjs/common';
import { fromDbDate } from '../common/db-date.js';
import {
  baseUnitCostOn,
  type UnitCostHistoryPoint,
} from '../costs/base-on-date.js';
import { replaceOutsideMarks } from '../expenses/prisma-outside-marks.js';
import { vendorDisplayName } from '../expenses/vendor-display.js';
import { Prisma, PrismaClient } from '../generated/prisma/client.js';
import { DATABASE_CLIENT } from '../prisma/prisma.service.js';
import type { ItemLinkInput } from './item-link-input.js';
import { priceAlert, type PriceAlert } from './price-alert.js';
import type {
  IssuedRange,
  ItemLinkRecord,
  ItemPriceRow,
  ItemSupplyLink,
  OutsideItemsChange,
  OutsideSnapshot,
  ProductPurchase,
  PurchaseInvoiceItemRow,
  PurchaseInvoiceRow,
  VendorSummary,
} from './purchase-records.js';
import type {
  PurchaseRepository,
  VendorRecord,
} from './purchase-repository.js';

const VENDOR_NAMES = { select: { legalName: true, nickname: true } } as const;

const issuedIn = (range: IssuedRange): Prisma.DateTimeFilter => ({
  gte: range.from,
  lt: range.until,
});

/** Itens fora da lanchonete (2026-10-25): fora de Preços e do Histórico, contados nas Notas. */
const OUTSIDE = { outsideBusiness: true } as const;
const FOR_BUSINESS = { outsideBusiness: false } as const;

const INVOICE_ITEM_SELECT = {
  position: true,
  code: true,
  description: true,
  quantity: true,
  unit: true,
  unitPrice: true,
  total: true,
  outsideBusiness: true,
} satisfies Prisma.PurchaseInvoiceItemSelect;

const INVOICE_ROW_SELECT = {
  id: true,
  expenseId: true,
  vendorId: true,
  number: true,
  series: true,
  issuedAt: true,
  amountDue: true,
  vendor: VENDOR_NAMES,
  items: {
    orderBy: { position: 'asc' },
    select: INVOICE_ITEM_SELECT,
  },
  expense: {
    select: { amount: true, closing: { select: { businessDate: true } } },
  },
} satisfies Prisma.PurchaseInvoiceSelect;

type InvoiceRow = Prisma.PurchaseInvoiceGetPayload<{
  select: typeof INVOICE_ROW_SELECT;
}>;

interface EnrichedLink {
  supplyId: number;
  supplyName: string;
  baseQuantity: string;
  label: string | null;
  unitCost: string | null;
}

type LinksByCode = Map<string, EnrichedLink>;
type SupplyHistories = Map<number, UnitCostHistoryPoint[]>;

function buildLinksMap(
  links: {
    vendorId: number;
    code: string;
    baseQuantity: Prisma.Decimal;
    label: string | null;
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
      unitCost: link.supply.unitCost ? link.supply.unitCost.toString() : null,
    });
  }
  return map;
}

function buildHistoryMap(
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
  item: InvoiceRow['items'][number],
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
      }
    : null;
  const alert = buildItemAlert(item, issuedAt, linkData, histories);
  return {
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

function toInvoiceRowWithAlerts(
  row: InvoiceRow,
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
    items,
  };
}

const PRICE_ROW_SELECT = {
  code: true,
  description: true,
  unit: true,
  unitPrice: true,
  position: true,
  invoiceId: true,
  invoice: { select: { issuedAt: true, vendorId: true, vendor: VENDOR_NAMES } },
} satisfies Prisma.PurchaseInvoiceItemSelect;

type PriceRow = Prisma.PurchaseInvoiceItemGetPayload<{
  select: typeof PRICE_ROW_SELECT;
}>;

function toPriceRow(row: PriceRow): ItemPriceRow {
  return {
    vendorId: row.invoice.vendorId,
    vendorName: vendorDisplayName(row.invoice.vendor),
    code: row.code,
    description: row.description,
    unit: row.unit,
    unitPrice: row.unitPrice.toString(),
    invoiceId: row.invoiceId,
    position: row.position,
    issuedAt: row.invoice.issuedAt,
  };
}

const HISTORY_SELECT = {
  invoiceId: true,
  description: true,
  quantity: true,
  unit: true,
  unitPrice: true,
  total: true,
  invoice: { select: { number: true, issuedAt: true } },
} satisfies Prisma.PurchaseInvoiceItemSelect;

type HistoryRow = Prisma.PurchaseInvoiceItemGetPayload<{
  select: typeof HISTORY_SELECT;
}>;

function toPurchase(row: HistoryRow): ProductPurchase {
  return {
    invoiceId: row.invoiceId,
    invoiceNumber: row.invoice.number,
    issuedAt: row.invoice.issuedAt.toISOString(),
    description: row.description,
    quantity: row.quantity.toString(),
    unit: row.unit,
    unitPrice: row.unitPrice.toString(),
    total: row.total.toFixed(2),
  };
}

const ZERO = new Prisma.Decimal(0);

/** O "a pagar" da nota menos os itens fora da lanchonete. */
function businessPart(invoice: {
  amountDue: Prisma.Decimal;
  items: { total: Prisma.Decimal }[];
}): Prisma.Decimal {
  return invoice.items.reduce(
    (rest, item) => rest.minus(item.total),
    invoice.amountDue,
  );
}

@Injectable()
export class PrismaPurchaseRepository implements PurchaseRepository {
  constructor(@Inject(DATABASE_CLIENT) private readonly prisma: PrismaClient) {}

  async listInvoices(range: IssuedRange): Promise<PurchaseInvoiceRow[]> {
    // Compras ignora notas de gastos cancelados (2026-11-08).
    const rows = await this.prisma.purchaseInvoice.findMany({
      where: { issuedAt: issuedIn(range), expense: { canceledAt: null } },
      orderBy: [{ issuedAt: 'desc' }, { id: 'desc' }],
      select: INVOICE_ROW_SELECT,
    });
    if (rows.length === 0) return [];
    const { links, histories } = await this.loadLinksAndHistories(rows);
    return rows.map((row) => toInvoiceRowWithAlerts(row, links, histories));
  }

  async findInvoice(id: number): Promise<PurchaseInvoiceRow | null> {
    const row = await this.prisma.purchaseInvoice.findUnique({
      where: { id, expense: { canceledAt: null } },
      select: INVOICE_ROW_SELECT,
    });
    if (!row) return null;
    const { links, histories } = await this.loadLinksAndHistories([row]);
    return toInvoiceRowWithAlerts(row, links, histories);
  }

  private async loadLinksAndHistories(rows: InvoiceRow[]) {
    const vendorIds = [...new Set(rows.map((r) => r.vendorId))];
    const linkRows = await this.prisma.vendorItemLink.findMany({
      where: { vendorId: { in: vendorIds } },
      include: {
        supply: { select: { id: true, name: true, unitCost: true } },
      },
    });
    const links = buildLinksMap(linkRows);
    const supplyIds = [...new Set(linkRows.map((l) => l.supplyId))];
    const historyRows =
      supplyIds.length > 0
        ? await this.prisma.supplyCostHistory.findMany({
            where: { supplyId: { in: supplyIds } },
            orderBy: { changeSet: { createdAt: 'asc' } },
            select: {
              supplyId: true,
              oldUnitCost: true,
              newUnitCost: true,
              changeSet: { select: { createdAt: true } },
            },
          })
        : [];
    const histories = buildHistoryMap(historyRows);
    return { links, histories };
  }

  async listItemPrices(range: IssuedRange): Promise<ItemPriceRow[]> {
    const rows = await this.prisma.purchaseInvoiceItem.findMany({
      where: {
        ...FOR_BUSINESS,
        invoice: { issuedAt: issuedIn(range), expense: { canceledAt: null } },
      },
      select: PRICE_ROW_SELECT,
    });
    return rows.map(toPriceRow);
  }

  async listProductHistory(
    vendorId: number,
    code: string,
    range: IssuedRange,
  ): Promise<ProductPurchase[]> {
    const rows = await this.prisma.purchaseInvoiceItem.findMany({
      where: {
        ...FOR_BUSINESS,
        code,
        invoice: {
          vendorId,
          issuedAt: issuedIn(range),
          expense: { canceledAt: null },
        },
      },
      orderBy: [{ invoice: { issuedAt: 'desc' } }, { position: 'asc' }],
      select: HISTORY_SELECT,
    });
    return rows.map(toPurchase);
  }

  async listVendors(range: IssuedRange): Promise<VendorSummary[]> {
    const vendors = await this.prisma.vendor.findMany({
      orderBy: { legalName: 'asc' },
      select: {
        id: true,
        cnpjRoot: true,
        legalName: true,
        nickname: true,
        invoices: {
          where: { issuedAt: issuedIn(range), expense: { canceledAt: null } },
          select: {
            amountDue: true,
            items: { where: OUTSIDE, select: { total: true } },
          },
        },
      },
    });
    return vendors.map(({ invoices, ...vendor }) => ({
      ...vendor,
      invoiceCount: invoices.length,
      total: invoices
        .reduce((sum, invoice) => sum.plus(businessPart(invoice)), ZERO)
        .toFixed(2),
    }));
  }

  async updateNickname(
    id: number,
    nickname: string | null,
  ): Promise<VendorRecord> {
    return this.prisma.vendor.update({
      where: { id },
      data: { nickname },
      select: { id: true, cnpjRoot: true, legalName: true, nickname: true },
    });
  }

  async findOutsideSnapshot(
    invoiceId: number,
  ): Promise<OutsideSnapshot | null> {
    const row = await this.prisma.purchaseInvoice.findUnique({
      where: { id: invoiceId, expense: { canceledAt: null } },
      select: {
        expenseId: true,
        discount: true,
        businessDiscount: true,
        expense: { select: { amount: true } },
        items: {
          orderBy: { position: 'asc' },
          select: { position: true, total: true, outsideBusiness: true },
        },
      },
    });
    if (!row) return null;
    return {
      invoiceId,
      expenseId: row.expenseId,
      expenseAmount: row.expense.amount.toFixed(2),
      discount: row.discount.toFixed(2),
      businessDiscount: row.businessDiscount.toFixed(2),
      items: row.items.map((item) => ({
        ...item,
        total: item.total.toFixed(2),
      })),
    };
  }

  async saveOutsideItems(change: OutsideItemsChange): Promise<boolean> {
    return this.prisma.$transaction(async (tx) => {
      const { count } = await tx.expense.updateMany({
        where: { id: change.expenseId, amount: change.previousAmount },
        data: { amount: change.expenseAmount },
      });
      if (count === 0) return false;
      await tx.purchaseInvoice.update({
        where: { id: change.invoiceId },
        data: { businessDiscount: change.businessDiscount },
      });
      await replaceOutsideMarks(
        tx,
        { invoiceId: change.invoiceId },
        change.positions,
      );
      return true;
    });
  }

  async saveItemLink(
    userId: number,
    input: ItemLinkInput,
  ): Promise<ItemLinkRecord> {
    const vendor = await this.prisma.vendor.findUnique({
      where: { id: input.vendorId },
      select: { id: true },
    });
    if (!vendor) {
      throw new UnprocessableEntityException(
        `Mercado ${input.vendorId} não encontrado`,
      );
    }
    const supply = await this.prisma.supply.findUnique({
      where: { id: input.supplyId },
      select: { id: true },
    });
    if (!supply) {
      throw new UnprocessableEntityException(
        `Insumo ${input.supplyId} não encontrado`,
      );
    }
    const row = await this.prisma.vendorItemLink.upsert({
      where: {
        vendorId_code: { vendorId: input.vendorId, code: input.code },
      },
      create: {
        vendorId: input.vendorId,
        code: input.code,
        supplyId: input.supplyId,
        baseQuantity: input.baseQuantity,
        label: input.label,
        createdById: userId,
      },
      update: {
        supplyId: input.supplyId,
        baseQuantity: input.baseQuantity,
        label: input.label,
        createdById: userId,
        createdAt: new Date(),
      },
    });
    return {
      id: row.id,
      vendorId: row.vendorId,
      code: row.code,
      supplyId: row.supplyId,
      baseQuantity: row.baseQuantity.toString(),
      label: row.label,
    };
  }

  async deleteItemLink(vendorId: number, code: string): Promise<boolean> {
    try {
      await this.prisma.vendorItemLink.delete({
        where: { vendorId_code: { vendorId, code } },
      });
      return true;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        return false;
      }
      throw error;
    }
  }
}
