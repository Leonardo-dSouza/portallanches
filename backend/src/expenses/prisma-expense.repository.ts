import { Inject, Injectable } from '@nestjs/common';
import { Prisma, PrismaClient } from '../generated/prisma/client.js';
import { DATABASE_CLIENT } from '../prisma/prisma.service.js';
import type {
  AttachedInvoice,
  ExpenseData,
  ExpenseInvoiceChange,
  ExpenseInvoiceSummary,
  ExpenseRecord,
  ExpenseRepository,
} from './expense-repository.js';
import { replaceOutsideMarks } from './prisma-outside-marks.js';
import { cnpjRootOf, vendorDisplayName } from './vendor-display.js';

const WITH_INVOICE_SUMMARY = {
  invoice: {
    select: {
      id: true,
      issuedAt: true,
      amountDue: true,
      vendor: { select: { legalName: true, nickname: true } },
      _count: { select: { items: true } },
      // Só os itens de fora, para o selo "· 3 fora" e a soma deles (2026-10-25).
      items: { where: { outsideBusiness: true }, select: { total: true } },
    },
  },
} satisfies Prisma.ExpenseInclude;

type ExpenseRow = Prisma.ExpenseGetPayload<{
  include: typeof WITH_INVOICE_SUMMARY;
}>;

function toSummary(
  invoice: NonNullable<ExpenseRow['invoice']>,
): ExpenseInvoiceSummary {
  return {
    id: invoice.id,
    vendorName: vendorDisplayName(invoice.vendor),
    issuedAt: invoice.issuedAt.toISOString(),
    itemCount: invoice._count.items,
    outsideItemCount: invoice.items.length,
    outsideTotal: invoice.items
      .reduce((sum, item) => sum.plus(item.total), new Prisma.Decimal(0))
      .toFixed(2),
    amountDue: invoice.amountDue.toFixed(2),
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
  };
}

/**
 * Nota com os itens (os de fora da lanchonete marcados) e o mercado (achado pela raiz do CNPJ
 * ou criado com a razão social).
 */
function invoiceCreate({
  invoice,
  outsidePositions,
}: AttachedInvoice): Prisma.PurchaseInvoiceCreateWithoutExpenseInput {
  const { issuerName, items, ...fields } = invoice;
  const cnpjRoot = cnpjRootOf(invoice.issuerCnpj);
  const outside = new Set(outsidePositions);
  return {
    ...fields,
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
  ): Promise<ExpenseRecord> {
    const row = await this.prisma.expense.create({
      data: {
        ...data,
        closingId,
        createdById,
        invoice: invoice ? { create: invoiceCreate(invoice) } : undefined,
      },
      include: WITH_INVOICE_SUMMARY,
    });
    return toRecord(row);
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
  ): Promise<ExpenseRecord> {
    if (change.kind === 'keep') return this.updateKept(id, data, change);
    // Tirar ou trocar: a nota velha sai antes, na mesma transação (a chave é única). A nova
    // é criada à parte: o `create` aninhado no update do 1-1 tenta desligar a velha e o
    // Prisma recusa ("would violate the required relation").
    return this.prisma.$transaction(async (tx) => {
      await tx.purchaseInvoice.deleteMany({ where: { expenseId: id } });
      if (change.kind === 'attach')
        await tx.purchaseInvoice.create({
          data: {
            ...invoiceCreate(change),
            expense: { connect: { id } },
          },
        });
      return this.updateFields(tx, id, data);
    });
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

  /** Nota mantida: só os campos, ou os campos e as marcas novas dos itens juntos. */
  private async updateKept(
    id: number,
    data: ExpenseData,
    { outsidePositions }: { outsidePositions?: number[] },
  ): Promise<ExpenseRecord> {
    if (!outsidePositions) return this.updateFields(this.prisma, id, data);
    return this.prisma.$transaction(async (tx) => {
      await replaceOutsideMarks(
        tx,
        { invoice: { expenseId: id } },
        outsidePositions,
      );
      return this.updateFields(tx, id, data);
    });
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
