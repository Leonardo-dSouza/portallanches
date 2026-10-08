import { Inject, Injectable } from '@nestjs/common';
import {
  DEFAULT_BUSINESS_TIMEZONE,
  parseDateRange,
  toBusinessDate,
} from '../closing/business-date.js';
import {
  CLOSING_RANGE_LOOKUP,
  type ClosingRangeLookup,
} from '../closing/closing-lookup.js';
import { BUSINESS_TIMEZONE, CLOCK, type Clock } from '../common/clock.js';
import {
  PERIOD_REPORT_SOURCE,
  type PeriodReportSource,
} from '../report/period-report-source.js';
import { REPORT_SOURCE, type ReportSource } from '../report/report-source.js';
import {
  buildAnalyticsReport,
  type AnalyticsReport,
} from './analytics-report.js';
import { ANALYTICS_SOURCE, type AnalyticsSource } from './analytics-source.js';
import { comparisonRanges } from './period-comparison.js';

const idsOf = (closings: { id: number }[]): number[] =>
  closings.map((closing) => closing.id);

@Injectable()
export class AnalyticsService {
  constructor(
    @Inject(ANALYTICS_SOURCE) private readonly source: AnalyticsSource,
    @Inject(PERIOD_REPORT_SOURCE)
    private readonly totals: Pick<PeriodReportSource, 'listOrders'>,
    @Inject(REPORT_SOURCE)
    private readonly methods: Pick<ReportSource, 'listPaymentMethods'>,
    @Inject(CLOSING_RANGE_LOOKUP) private readonly closings: ClosingRangeLookup,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(BUSINESS_TIMEZONE)
    private readonly timeZone: string = DEFAULT_BUSINESS_TIMEZONE,
  ) {}

  /**
   * Análise de `from` a `to` (inclusivo, máx. 366 dias), comparada com o período anterior.
   * Período em andamento conta só até hoje e compara com o mesmo trecho de antes.
   *
   * @example await service.forRange('2026-09-01', '2026-09-30');
   */
  async forRange(
    rawFrom: string | undefined,
    rawTo: string | undefined,
  ): Promise<AnalyticsReport> {
    const { from, to } = parseDateRange(rawFrom, rawTo);
    const today = toBusinessDate(this.clock(), this.timeZone);
    const { elapsedTo, previous } = comparisonRanges(from, to, today);
    const closings = await this.closings.listBetween(from, elapsedTo);
    const before = await this.closings.listBetween(previous.from, previous.to);
    const [orders, previousOrders, categoryOrder, paymentMethods] =
      await Promise.all([
        this.source.listOrders(idsOf(closings)),
        this.totals.listOrders(idsOf(before)),
        this.source.listCategoryOrder(),
        this.methods.listPaymentMethods(),
      ]);
    return buildAnalyticsReport({
      from,
      to,
      elapsedTo,
      previous,
      closings,
      orders,
      previousOrders,
      categoryOrder,
      paymentMethods,
    });
  }
}
