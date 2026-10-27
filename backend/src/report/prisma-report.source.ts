import { Inject, Injectable } from '@nestjs/common';
import { PrismaClient } from '../generated/prisma/client.js';
import { toEntries } from '../orders/prisma-order-items.js';
import { DATABASE_CLIENT } from '../prisma/prisma.service.js';
import {
  consumptionCost,
  type ConsumptionCost,
} from '../staff-consumption/consumption-cost.js';
import type {
  ReportFiadoPaymentRow,
  ReportOrderRow,
  ReportPaymentMethodRow,
  ReportSource,
} from './report-source.js';

@Injectable()
export class PrismaReportSource implements ReportSource {
  constructor(@Inject(DATABASE_CLIENT) private readonly prisma: PrismaClient) {}

  async listOrders(closingId: number): Promise<ReportOrderRow[]> {
    const rows = await this.prisma.order.findMany({ where: { closingId } });
    return rows.map((row) => ({
      amount: row.amount.toFixed(2),
      type: row.type,
      paymentMethodId: row.paymentMethodId,
      paymentMode: row.paymentMode,
      deliveryFee: row.deliveryFee?.toFixed(2) ?? null,
      ...(row.canceledAt && {
        canceled: { dayNumber: row.dayNumber, reason: row.cancelReason },
      }),
    }));
  }

  async listExpenseAmounts(closingId: number): Promise<string[]> {
    const rows = await this.prisma.expense.findMany({
      where: { closingId },
      select: { amount: true },
    });
    return rows.map((row) => row.amount.toFixed(2));
  }

  async listStaffConsumptionCosts(
    closingId: number,
  ): Promise<ConsumptionCost[]> {
    const rows = await this.prisma.staffConsumption.findMany({
      where: { closingId },
      include: { items: { orderBy: { id: 'asc' } } },
    });
    return rows.map((row) => consumptionCost(toEntries(row.items)));
  }

  listPaymentMethods(): Promise<ReportPaymentMethodRow[]> {
    return this.prisma.paymentMethod.findMany({
      select: {
        id: true,
        name: true,
        sortOrder: true,
        isCardTerminal: true,
        isFiado: true,
      },
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    });
  }

  async listFiadoPayments(closingId: number): Promise<ReportFiadoPaymentRow[]> {
    const rows = await this.prisma.fiadoPayment.findMany({
      where: { closingId, canceledAt: null },
    });
    return rows.map((row) => ({
      amount: row.amount.toFixed(2),
      extra: row.extra.toFixed(2),
      paymentMethodId: row.paymentMethodId,
      paymentMode: row.paymentMode,
    }));
  }
}
