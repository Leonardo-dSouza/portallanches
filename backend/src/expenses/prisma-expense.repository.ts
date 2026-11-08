import { Inject, Injectable } from '@nestjs/common';
import { Prisma, PrismaClient } from '../generated/prisma/client.js';
import { DATABASE_CLIENT } from '../prisma/prisma.service.js';
import type {
  ExpenseEventInput,
  ExpenseEventRecord,
} from './expense-events.js';
import type {
  AttachedInvoice,
  ExpenseData,
  ExpenseInvoiceChange,
  ExpenseInvoiceSummary,
  ExpenseRecord,
  ExpenseRepository,
} from './expense-repository.js';
import {
  listExpenseEvents,
  writeExpenseEvent,
} from './prisma-expense-events.js';
import { replaceOutsideMarks } from './prisma-outside-marks.js';
import { cnpjRootOf, vendorDisplayName } from './vendor-display.js';

const WITH_INVOICE_SUMMARY = {
  invoice: {
    select: {
      id: true,
      issuedAt: true,
      amountDue: true,
      paymentLabel: true,
      discount: true,
      businessDiscount: true,
      vendor: { select: { legalName: true, nickname: true } },
      _count: { select: { items: true } },
      items: {
        select: { position: true, total: true, outsideBusiness: true },
      },
    },
  },
} satisfies Prisma.ExpenseInclude;

type ExpenseRow = Prisma.ExpenseGetPayload<{
  include: typeof WITH_INVOICE_SUMMARY;
}>;

function toSummary(
  invoice: NonNullable<ExpenseRow['invoice']>,
): ExpenseInvoiceSummary {
  const outsideItems = invoice.items.filter((item) => item.outsideBusiness);
  const gross = outsideItems.reduce(
    (sum, item) => sum.plus(item.total),
    new Prisma.Decimal(0),
  );
  const outsideDiscount =
    outsideItems.length > 0
      ? invoice.discount.minus(invoice.businessDiscount)
      : new Prisma.Decimal(0);
  return {
    id: invoice.id,
    vendorName: vendorDisplayName(invoice.vendor),
    issuedAt: invoice.issuedAt.toISOString(),
    itemCount: invoice._count.items,
    outsideItemCount: outsideItems.length,
    outsideTotal: gross.minus(outsideDiscount).toFixed(2),
    amountDue: invoice.amountDue.toFixed(2),
    paymentLabel: invoice.paymentLabel,
  };
}

function toRecord(row: ExpenseRow): ExpenseRecord {
  return {
    id: row.id,
    closingId: row.closingId,
    createdById: row.createdById,
    expenseTypeId: row.expenseTypeId,
    description: row.description,
    amount: row.amount.toFixed(2),
    invoice: row.invoice && toSummary(row.invoice),
    canceledAt: row.canceledAt,
    canceledById: row.canceledById,
    invoiceDiscount: row.invoice?.discount.toFixed(2),
    invoiceItems: row.invoice?.items.map((item) => ({
      position: item.position,
      total: item.total.toFixed(2),
      outsideBusiness: item.outsideBusiness,
    })),
  };
}

/**
 * Nota com os itens (os de fora da lanchonete marcados) e o mercado (achado pela raiz do CNPJ
 * ou criado com a razão social).
 */
function invoiceCreate({
  invoice,
  outsidePositions,
  businessDiscount,
}: AttachedInvoice): Prisma.PurchaseInvoiceCreateWithoutExpenseInput {
  const { issuerName, items, ...fields } = invoice;
  const cnpjRoot = cnpjRootOf(invoice.issuerCnpj);
  const outside = new Set(outsidePositions);
  return {
    ...fields,
    businessDiscount,
    vendor: {
      connectOrCreate: {
        where: { cnpjRoot },
        create: { cnpjRoot, legalName: issuerName },
      },
    },
    items: {
      create: items.map((item) => ({
        ...item,
        outsideBusiness: outside.has(item.position),
      })),
    },
  };
}

@Injectable()
export class PrismaExpenseRepository implements ExpenseRepository {
  constructor(@Inject(DATABASE_CLIENT) private readonly prisma: PrismaClient) {}

  async create(
    closingId: number,
    createdById: number,
    data: ExpenseData,
    invoice: AttachedInvoice | null,
    event?: ExpenseEventInput,
  ): Promise<ExpenseRecord> {
    return this.prisma.$transaction(async (tx) => {
      const row = await tx.expense.create({
        data: {
          ...data,
          closingId,
          createdById,
          invoice: invoice ? { create: invoiceCreate(invoice) } : undefined,
        },
        include: WITH_INVOICE_SUMMARY,
      });
      if (event) await writeExpenseEvent(tx, row.id, event);
      return toRecord(row);
    });
  }

  async findById(id: number): Promise<ExpenseRecord | null> {
    const row = await this.prisma.expense.findUnique({
      where: { id },
      include: WITH_INVOICE_SUMMARY,
    });
    return row && toRecord(row);
  }

  async update(
    id: number,
    data: ExpenseData,
    change: ExpenseInvoiceChange,
    event?: ExpenseEventInput,
  ): Promise<ExpenseRecord> {
    return this.prisma.$transaction(async (tx) => {
      if (change.kind === 'keep') {
        // Desconto da lanchonete editado com a nota mantida (2026-11-08, card 3).
        if (change.businessDiscount !== undefined) {
          await tx.purchaseInvoice.update({
            where: { expenseId: id },
            data: { businessDiscount: change.businessDiscount },
          });
        }
        if (change.outsidePositions) {
          await replaceOutsideMarks(
            tx,
            { invoice: { expenseId: id } },
            change.outsidePositions,
          );
        }
      } else {
        await tx.purchaseInvoice.deleteMany({ where: { expenseId: id } });
        if (change.kind === 'attach') {
          await tx.purchaseInvoice.create({
            data: {
              ...invoiceCreate(change),
              expense: { connect: { id } },
            },
          });
        }
      }
      const record = await this.updateFields(tx, id, data);
      if (event) await writeExpenseEvent(tx, id, event);
      return record;
    });
  }

  async cancel(
    id: number,
    canceledById: number,
    at: Date,
    event: ExpenseEventInput,
  ): Promise<ExpenseRecord> {
    return this.prisma.$transaction(async (tx) => {
      await writeExpenseEvent(tx, id, event);
      const row = await tx.expense.update({
        where: { id },
        data: { canceledAt: at, canceledById },
        include: WITH_INVOICE_SUMMARY,
      });
      return toRecord(row);
    });
  }

  async restore(id: number, event: ExpenseEventInput): Promise<ExpenseRecord> {
    return this.prisma.$transaction(async (tx) => {
      await writeExpenseEvent(tx, id, event);
      const row = await tx.expense.update({
        where: { id },
        data: { canceledAt: null, canceledById: null },
        include: WITH_INVOICE_SUMMARY,
      });
      return toRecord(row);
    });
  }

  listEvents(expenseId: number): Promise<ExpenseEventRecord[]> {
    return listExpenseEvents(this.prisma, expenseId);
  }

  async delete(id: number): Promise<void> {
    await this.prisma.expense.delete({ where: { id } });
  }

  async listByClosing(closingId: number): Promise<ExpenseRecord[]> {
    const rows = await this.prisma.expense.findMany({
      where: { closingId },
      orderBy: { id: 'asc' },
      include: WITH_INVOICE_SUMMARY,
    });
    return rows.map(toRecord);
  }

  private async updateFields(
    client: Prisma.TransactionClient,
    id: number,
    data: Prisma.ExpenseUncheckedUpdateInput,
  ): Promise<ExpenseRecord> {
    const row = await client.expense.update({
      where: { id },
      data,
      include: WITH_INVOICE_SUMMARY,
    });
    return toRecord(row);
  }
}
