import { Inject, Injectable } from '@nestjs/common';
import type { SessionUser } from '../auth/session-user.js';
import { DEFAULT_BUSINESS_TIMEZONE } from '../closing/business-date.js';
import {
  CLOSING_LOOKUP,
  type ClosingLookup,
} from '../closing/closing-lookup.js';
import type { ClosingRecord } from '../closing/closing-repository.js';
import { isLiveNight } from '../closing/live-night.js';
import { BUSINESS_TIMEZONE, CLOCK, type Clock } from '../common/clock.js';
import { fiadoNight } from './fiado-report.js';
import { buildClosingReport, type ClosingReport } from './report-builder.js';
import { REPORT_SOURCE, type ReportSource } from './report-source.js';

@Injectable()
export class ReportService {
  constructor(
    @Inject(REPORT_SOURCE) private readonly source: ReportSource,
    @Inject(CLOSING_LOOKUP) private readonly closings: ClosingLookup,
    @Inject(CLOCK) private readonly clock: Clock = () => new Date(),
    @Inject(BUSINESS_TIMEZONE)
    private readonly timeZone: string = DEFAULT_BUSINESS_TIMEZONE,
  ) {}

  /**
   * Relatório do fechamento da data escolhida, padrão hoje (totais por forma de pagamento, motoboy,
   * gastos, consumo interno e o recebido de fiado).
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
    const [orders, expenseAmounts, paymentMethods, staffConsumptionCosts] =
      await Promise.all([
        this.source.listOrders(closing.id),
        this.source.listExpenseAmounts(closing.id),
        this.source.listPaymentMethods(),
        this.source.listStaffConsumptionCosts(closing.id),
      ]);
    // O recebido de fiado da noite (2026-10-25) e os fiados vendidos nela (2026-11-01).
    const [fiadoPayments, fiadoSold] = await Promise.all([
      this.source.listFiadoPayments(closing.id),
      this.source.listFiadoSold(closing.id),
    ]);
    const isLive =
      closing.status === 'OPEN' &&
      isLiveNight(closing.businessDate, this.clock(), this.timeZone);
    const report = buildClosingReport({
      closing,
      orders,
      expenseAmounts,
      paymentMethods,
      staffConsumptionCosts,
      fiadoPayments,
      isLive,
    });
    return {
      ...report,
      ...fiadoNight(fiadoPayments, fiadoSold, paymentMethods),
    };
  }
}
