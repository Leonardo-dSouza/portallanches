import { Inject, Injectable } from '@nestjs/common';
import { PrismaClient } from '../generated/prisma/client.js';
import {
  PAYMENT_PARTS_IN_ORDER,
  toPaymentPart,
} from '../orders/prisma-payment-parts.js';
import { DATABASE_CLIENT } from '../prisma/prisma.service.js';
import type {
  ClosingExpenseRow,
  ClosingFiadoPaymentRow,
  ClosingOrderRow,
  PeriodReportSource,
} from './period-report-source.js';

@Injectable()
export class PrismaPeriodReportSource implements PeriodReportSource {
  constructor(@Inject(DATABASE_CLIENT) private readonly prisma: PrismaClient) {}

  async listOrders(closingIds: number[]): Promise<ClosingOrderRow[]> {
    // Cancelados (2026-10-15) ficam fora do período inteiro.
    const rows = await this.prisma.order.findMany({
      where: { closingId: { in: closingIds }, canceledAt: null },
      include: { paymentParts: PAYMENT_PARTS_IN_ORDER },
    });
    return rows.map((row) => ({
      closingId: row.closingId,
      amount: row.amount.toFixed(2),
      type: row.type,
      paymentMethodId: row.paymentMethodId,
      paymentMode: row.paymentMode,
      deliveryFee: row.deliveryFee?.toFixed(2) ?? null,
      paymentParts: row.paymentParts.map(toPaymentPart),
    }));
  }

  async listExpenses(closingIds: number[]): Promise<ClosingExpenseRow[]> {
    // Cancelados (2026-11-08) saem do relatório do período.
    const rows = await this.prisma.expense.findMany({
      where: { closingId: { in: closingIds }, canceledAt: null },
      select: { closingId: true, amount: true },
    });
    return rows.map((row) => ({
      closingId: row.closingId,
      amount: row.amount.toFixed(2),
    }));
  }

  async listFiadoPayments(
    closingIds: number[],
  ): Promise<ClosingFiadoPaymentRow[]> {
    const rows = await this.prisma.fiadoPayment.findMany({
      where: { closingId: { in: closingIds }, canceledAt: null },
    });
    return rows.map((row) => ({
      closingId: row.closingId,
      amount: row.amount.toFixed(2),
      extra: row.extra.toFixed(2),
      paymentMethodId: row.paymentMethodId,
      paymentMode: row.paymentMode,
    }));
  }
}
