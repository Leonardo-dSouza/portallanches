import { Inject, Injectable } from '@nestjs/common';
import { fromDbDate } from '../common/db-date.js';
import { Prisma, PrismaClient } from '../generated/prisma/client.js';
import { DATABASE_CLIENT } from '../prisma/prisma.service.js';
import type {
  ExpenseInvoiceDetail,
  ExpenseInvoiceRepository,
  InvoiceSuggestion,
  InvoiceUse,
} from './expense-invoice-repository.js';
import type { OutsideDecision } from './outside-items.js';
import { vendorDisplayName } from './vendor-display.js';

const DETAIL_INCLUDE = {
  vendor: { select: { legalName: true, nickname: true } },
  items: { orderBy: { position: 'asc' } },
  expense: { select: { amount: true, closingId: true } },
} satisfies Prisma.PurchaseInvoiceInclude;

type DetailRow = Prisma.PurchaseInvoiceGetPayload<{
  include: typeof DETAIL_INCLUDE;
}>;

function toDetail(row: DetailRow): ExpenseInvoiceDetail {
  return {
    id: row.id,
    accessKey: row.accessKey,
    vendorName: vendorDisplayName(row.vendor),
    legalName: row.vendor.legalName,
    issuerCnpj: row.issuerCnpj,
    number: row.number,
    series: row.series,
    issuedAt: row.issuedAt.toISOString(),
    itemsTotal: row.itemsTotal.toFixed(2),
    discount: row.discount.toFixed(2),
    amountDue: row.amountDue.toFixed(2),
    paymentLabel: row.paymentLabel,
    items: row.items.map((item) => ({
      position: item.position,
      code: item.code,
      description: item.description,
      quantity: item.quantity.toString(),
      unit: item.unit,
      unitPrice: item.unitPrice.toString(),
      total: item.total.toFixed(2),
      outsideBusiness: item.outsideBusiness,
    })),
    expenseId: row.expenseId,
    expenseAmount: row.expense.amount.toFixed(2),
    closingId: row.expense.closingId,
  };
}

@Injectable()
export class PrismaExpenseInvoiceRepository implements ExpenseInvoiceRepository {
  constructor(@Inject(DATABASE_CLIENT) private readonly prisma: PrismaClient) {}

  async findUseByKey(accessKey: string): Promise<InvoiceUse | null> {
    const row = await this.prisma.purchaseInvoice.findUnique({
      where: { accessKey },
      select: {
        expenseId: true,
        expense: { select: { closing: { select: { businessDate: true } } } },
      },
    });
    if (!row) return null;
    const businessDate = fromDbDate(row.expense.closing.businessDate);
    return { expenseId: row.expenseId, businessDate };
  }

  async findDetail(id: number): Promise<ExpenseInvoiceDetail | null> {
    const row = await this.prisma.purchaseInvoice.findUnique({
      where: { id },
      include: DETAIL_INCLUDE,
    });
    return row && toDetail(row);
  }

  async findVendorNickname(cnpjRoot: string): Promise<string | null> {
    const vendor = await this.prisma.vendor.findUnique({
      where: { cnpjRoot },
      select: { nickname: true },
    });
    return vendor?.nickname ?? null;
  }

  async findLastSuggestion(
    cnpjRoot: string,
  ): Promise<InvoiceSuggestion | null> {
    const last = await this.prisma.purchaseInvoice.findFirst({
      where: { vendor: { cnpjRoot } },
      orderBy: { id: 'desc' },
      select: {
        expense: { select: { expenseTypeId: true, description: true } },
      },
    });
    return last?.expense ?? null;
  }

  async findOutsideDecisions(
    cnpjRoot: string,
    codes: string[],
  ): Promise<OutsideDecision[]> {
    return this.prisma.purchaseInvoiceItem.findMany({
      where: { code: { in: codes }, invoice: { vendor: { cnpjRoot } } },
      orderBy: [{ invoice: { issuedAt: 'desc' } }, { id: 'desc' }],
      select: { code: true, outsideBusiness: true },
    });
  }
}
