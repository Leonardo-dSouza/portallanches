import { Inject, Injectable } from '@nestjs/common';
import type { SessionUser } from '../auth/session-user.js';
import {
  CLOSING_LOOKUP,
  type ClosingLookup,
} from '../closing/closing-lookup.js';
import type { ClosingRecord } from '../closing/closing-repository.js';
import { buildClosingReport, type ClosingReport } from './report-builder.js';
import { REPORT_SOURCE, type ReportSource } from './report-source.js';

@Injectable()
export class ReportService {
  constructor(
    @Inject(REPORT_SOURCE) private readonly source: ReportSource,
    @Inject(CLOSING_LOOKUP) private readonly closings: ClosingLookup,
  ) {}

  /**
   * Relatório do fechamento da data escolhida, padrão hoje (totais por forma de pagamento, motoboy e gastos).
   *
   * @example const report = await service.forSelected(user);
   */
  async forSelected(
    user: SessionUser,
    rawDate?: string,
  ): Promise<ClosingReport> {
    return this.build(await this.closings.getFor(user, rawDate));
  }

  async forDate(rawDate: string): Promise<ClosingReport> {
    return this.build(await this.closings.getByDate(rawDate));
  }

  private async build(closing: ClosingRecord): Promise<ClosingReport> {
    const [orders, expenseAmounts, paymentMethods] = await Promise.all([
      this.source.listOrders(closing.id),
      this.source.listExpenseAmounts(closing.id),
      this.source.listPaymentMethods(),
    ]);
    return buildClosingReport({
      closing,
      orders,
      expenseAmounts,
      paymentMethods,
    });
  }
}
