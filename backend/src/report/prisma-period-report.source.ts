import { Inject, Injectable } from '@nestjs/common';
import { PrismaClient } from '../generated/prisma/client.js';
import { DATABASE_CLIENT } from '../prisma/prisma.service.js';
import type {
  ClosingExpenseRow,
  ClosingOrderRow,
  PeriodReportSource,
} from './period-report-source.js';

@Injectable()
export class PrismaPeriodReportSource implements PeriodReportSource {
  constructor(@Inject(DATABASE_CLIENT) private readonly prisma: PrismaClient) {}

  async listOrders(closingIds: number[]): Promise<ClosingOrderRow[]> {
    const rows = await this.prisma.order.findMany({
      where: { closingId: { in: closingIds } },
    });
    return rows.map((row) => ({
      closingId: row.closingId,
      amount: row.amount.toFixed(2),
      type: row.type,
      paymentMethodId: row.paymentMethodId,
      deliveryFee: row.deliveryFee.toFixed(2),
    }));
  }

  async listExpenses(closingIds: number[]): Promise<ClosingExpenseRow[]> {
    const rows = await this.prisma.expense.findMany({
      where: { closingId: { in: closingIds } },
      select: { closingId: true, amount: true },
    });
    return rows.map((row) => ({
      closingId: row.closingId,
      amount: row.amount.toFixed(2),
    }));
  }
}
