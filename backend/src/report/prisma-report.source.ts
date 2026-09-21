import { Inject, Injectable } from '@nestjs/common';
import { PrismaClient } from '../generated/prisma/client.js';
import { DATABASE_CLIENT } from '../prisma/prisma.service.js';
import type {
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
      deliveryFee: row.deliveryFee?.toFixed(2) ?? null,
    }));
  }

  async listExpenseAmounts(closingId: number): Promise<string[]> {
    const rows = await this.prisma.expense.findMany({
      where: { closingId },
      select: { amount: true },
    });
    return rows.map((row) => row.amount.toFixed(2));
  }

  listPaymentMethods(): Promise<ReportPaymentMethodRow[]> {
    return this.prisma.paymentMethod.findMany({
      select: { id: true, name: true, sortOrder: true },
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    });
  }
}
