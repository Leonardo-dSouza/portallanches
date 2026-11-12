import { Inject, Injectable } from '@nestjs/common';
import {
  DailyClosing,
  Prisma,
  PrismaClient,
} from '../generated/prisma/client.js';
import { DATABASE_CLIENT } from '../prisma/prisma.service.js';
import { toCountPaymentMethods } from '../report/drawer-check.js';
import { PrismaReportSource } from '../report/prisma-report.source.js';
import { cashByPaymentMethod } from '../report/revenue.js';
import type { DayGroup } from './business-date.js';
import type {
  ClosingRecord,
  ClosingRepository,
  DrawerClosingContext,
  NewClosing,
  OpenOrderRef,
} from './closing-repository.js';
import type { DrawerCountItemInput } from './drawer-count-input.js';

function toRecord(row: DailyClosing): ClosingRecord {
  return {
    ...row,
    businessDate: row.businessDate.toISOString().slice(0, 10),
    motoboyDailyRate: row.motoboyDailyRate.toFixed(2),
    openingCash: row.openingCash?.toFixed(2) ?? null,
  };
}

const toDbDate = (businessDate: string): Date =>
  new Date(`${businessDate}T00:00:00Z`);

/**
 * Fecha o dia e conclui o andamento dos pedidos dele (todos viram Entregue; decisão do
 * usuário, 2026-10-10). `closedFields` traz quem fechou e, com a contagem, quem contou.
 */
async function closeInTransaction(
  tx: Prisma.TransactionClient,
  id: number,
  closedFields: Prisma.DailyClosingUncheckedUpdateInput,
): Promise<ClosingRecord> {
  await tx.order.updateMany({
    where: { closingId: id, status: { not: 'DELIVERED' }, canceledAt: null },
    data: { status: 'DELIVERED' },
  });
  const row = await tx.dailyClosing.update({
    where: { id },
    data: { status: 'CLOSED', ...closedFields },
  });
  return toRecord(row);
}

@Injectable()
export class PrismaClosingRepository implements ClosingRepository {
  /** As mesmas linhas do relatório: o que se conta no fechamento sai da mesma soma (card 7). */
  private readonly reportRows: PrismaReportSource;

  constructor(@Inject(DATABASE_CLIENT) private readonly prisma: PrismaClient) {
    this.reportRows = new PrismaReportSource(prisma);
  }

  async findByDate(businessDate: string): Promise<ClosingRecord | null> {
    const row = await this.prisma.dailyClosing.findUnique({
      where: { businessDate: toDbDate(businessDate) },
    });
    return row && toRecord(row);
  }

  async findById(id: number): Promise<ClosingRecord | null> {
    const row = await this.prisma.dailyClosing.findUnique({ where: { id } });
    return row && toRecord(row);
  }

  async list(): Promise<ClosingRecord[]> {
    const rows = await this.prisma.dailyClosing.findMany({
      orderBy: { businessDate: 'desc' },
    });
    return rows.map(toRecord);
  }

  async listBetween(from: string, to: string): Promise<ClosingRecord[]> {
    const rows = await this.prisma.dailyClosing.findMany({
      where: { businessDate: { gte: toDbDate(from), lte: toDbDate(to) } },
      orderBy: { businessDate: 'asc' },
    });
    return rows.map(toRecord);
  }

  async findMotoboyRate(
    dayGroup: DayGroup,
    businessDate: string,
  ): Promise<string | null> {
    const setting = await this.prisma.motoboyRateSetting.findFirst({
      where: { dayGroup, effectiveFrom: { lte: toDbDate(businessDate) } },
      orderBy: { effectiveFrom: 'desc' },
    });
    return setting?.amount.toFixed(2) ?? null;
  }

  async createIfAbsent(newClosing: NewClosing): Promise<ClosingRecord> {
    const row = await this.prisma.dailyClosing.upsert({
      where: { businessDate: toDbDate(newClosing.businessDate) },
      update: {},
      create: {
        businessDate: toDbDate(newClosing.businessDate),
        motoboyDailyRate: newClosing.motoboyDailyRate,
      },
    });
    return toRecord(row);
  }

  async recordOpening(
    id: number,
    amount: string,
    userId: number,
    at: Date,
  ): Promise<ClosingRecord> {
    const row = await this.prisma.dailyClosing.update({
      where: { id },
      data: {
        openingCash: amount,
        openedById: userId,
        openedAt: at,
      },
    });
    return toRecord(row);
  }

  async markClosed(
    id: number,
    userId: number,
    at: Date,
  ): Promise<ClosingRecord> {
    return this.prisma.$transaction((tx) =>
      closeInTransaction(tx, id, { closedById: userId, closedAt: at }),
    );
  }

  async markClosedWithCount(
    id: number,
    userId: number,
    at: Date,
    counts: DrawerCountItemInput[],
    note: string | null,
  ): Promise<ClosingRecord> {
    // Refechar depois de reabrir substitui a contagem anterior.
    return this.prisma.$transaction(async (tx) => {
      await tx.closingCount.deleteMany({ where: { closingId: id } });
      await tx.closingCount.createMany({
        data: counts.map((count) => ({ closingId: id, ...count })),
      });
      return closeInTransaction(tx, id, {
        closedById: userId,
        closedAt: at,
        countedById: userId,
        countedAt: at,
        notes: note,
      });
    });
  }

  async findDrawerCountContext(
    closingId: number,
  ): Promise<DrawerClosingContext> {
    const [methods, orders, fiados] = await Promise.all([
      this.reportRows.listPaymentMethods(),
      this.reportRows.listOrders(closingId),
      this.reportRows.listFiadoPayments(closingId),
    ]);
    const totals = cashByPaymentMethod(orders, fiados, methods);
    return {
      toCount: toCountPaymentMethods(methods, totals),
      knownMethods: methods,
    };
  }

  async listOpenOrders(closingId: number): Promise<OpenOrderRef[]> {
    // O tipo separa a conta aberta dos pedidos importados da planilha (sem tipo nem forma);
    // a conta aberta cancelada não segura o fechamento.
    return this.prisma.order.findMany({
      where: {
        closingId,
        paymentMethodId: null,
        type: { not: null },
        canceledAt: null,
      },
      select: { dayNumber: true, customerName: true },
      orderBy: { dayNumber: 'asc' },
    });
  }

  async markReopened(
    id: number,
    userId: number,
    at: Date,
  ): Promise<ClosingRecord> {
    const row = await this.prisma.dailyClosing.update({
      where: { id },
      data: { status: 'OPEN', reopenedById: userId, reopenedAt: at },
    });
    return toRecord(row);
  }
}
