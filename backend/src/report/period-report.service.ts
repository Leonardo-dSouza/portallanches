import { Inject, Injectable } from '@nestjs/common';
import {
  CLOSING_RANGE_LOOKUP,
  type ClosingRangeLookup,
} from '../closing/closing-lookup.js';
import {
  parseDateRange,
  parseWeekdayFilter,
  weekdayOf,
} from '../closing/business-date.js';
import {
  PERIOD_REPORT_SOURCE,
  type PeriodReportSource,
} from './period-report-source.js';
import { buildPeriodReport, type PeriodReport } from './period-report.js';
import { REPORT_SOURCE, type ReportSource } from './report-source.js';

@Injectable()
export class PeriodReportService {
  constructor(
    @Inject(PERIOD_REPORT_SOURCE) private readonly source: PeriodReportSource,
    @Inject(REPORT_SOURCE)
    private readonly methods: Pick<ReportSource, 'listPaymentMethods'>,
    @Inject(CLOSING_RANGE_LOOKUP) private readonly closings: ClosingRangeLookup,
  ) {}

  /**
   * Relatório somado de `from` a `to` (inclusivo, máx. 366 dias). Com `weekday` (0 = domingo),
   * só os dias desse dia da semana entram, inclusive nos totais (ex.: todas as quintas do mês).
   *
   * @example await service.forRange('2026-09-01', '2026-09-30', '4');
   */
  async forRange(
    rawFrom: string | undefined,
    rawTo: string | undefined,
    rawWeekday?: string,
  ): Promise<PeriodReport> {
    const { from, to } = parseDateRange(rawFrom, rawTo);
    const weekday = parseWeekdayFilter(rawWeekday);
    const inRange = await this.closings.listBetween(from, to);
    const closings =
      weekday === null
        ? inRange
        : inRange.filter((c) => weekdayOf(c.businessDate) === weekday);
    const ids = closings.map((closing) => closing.id);
    const [orders, expenses, paymentMethods] = await Promise.all([
      this.source.listOrders(ids),
      this.source.listExpenses(ids),
      this.methods.listPaymentMethods(),
    ]);
    return buildPeriodReport({
      from,
      to,
      closings,
      orders,
      expenses,
      paymentMethods,
    });
  }
}
