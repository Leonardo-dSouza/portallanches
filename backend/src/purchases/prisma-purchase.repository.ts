import { Inject, Injectable } from '@nestjs/common';
import { fromDbDate } from '../common/db-date.js';
import { replaceOutsideMarks } from '../expenses/prisma-outside-marks.js';
import { vendorDisplayName } from '../expenses/vendor-display.js';
import { Prisma, PrismaClient } from '../generated/prisma/client.js';
import { DATABASE_CLIENT } from '../prisma/prisma.service.js';
import type {
  IssuedRange,
  ItemPriceRow,
  OutsideItemsChange,
  OutsideSnapshot,
  ProductPurchase,
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

const INVOICE_ROW_SELECT = {
  id: true,
  expenseId: true,
  vendorId: true,
  number: true,
  series: true,
  issuedAt: true,
  amountDue: true,
  vendor: VENDOR_NAMES,
  _count: { select: { items: true } },
  items: { where: OUTSIDE, select: { position: true } },
  expense: {
    select: { amount: true, closing: { select: { businessDate: true } } },
  },
} satisfies Prisma.PurchaseInvoiceSelect;

type InvoiceRow = Prisma.PurchaseInvoiceGetPayload<{
  select: typeof INVOICE_ROW_SELECT;
}>;

function toInvoiceRow(row: InvoiceRow): PurchaseInvoiceRow {
  return {
    id: row.id,
    expenseId: row.expenseId,
    vendorId: row.vendorId,
    vendorName: vendorDisplayName(row.vendor),
    number: row.number,
    series: row.series,
    issuedAt: row.issuedAt.toISOString(),
    itemCount: row._count.items,
    outsideItemCount: row.items.length,
    amountDue: row.amountDue.toFixed(2),
    expenseAmount: row.expense.amount.toFixed(2),
    businessDate: fromDbDate(row.expense.closing.businessDate),
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
    const rows = await this.prisma.purchaseInvoice.findMany({
      where: { issuedAt: issuedIn(range) },
      orderBy: [{ issuedAt: 'desc' }, { id: 'desc' }],
      select: INVOICE_ROW_SELECT,
    });
    return rows.map(toInvoiceRow);
  }

  async listItemPrices(range: IssuedRange): Promise<ItemPriceRow[]> {
    const rows = await this.prisma.purchaseInvoiceItem.findMany({
      where: { ...FOR_BUSINESS, invoice: { issuedAt: issuedIn(range) } },
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
        invoice: { vendorId, issuedAt: issuedIn(range) },
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
          where: { issuedAt: issuedIn(range) },
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
      where: { id: invoiceId },
      select: {
        expenseId: true,
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
      await replaceOutsideMarks(
        tx,
        { invoiceId: change.invoiceId },
        change.positions,
      );
      return true;
    });
  }
}
