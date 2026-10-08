import { Inject, Injectable } from '@nestjs/common';
import { parseDateRange } from '../closing/business-date.js';
import {
  CLOSING_RANGE_LOOKUP,
  type ClosingRangeLookup,
} from '../closing/closing-lookup.js';
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
import { previousRange } from './period-comparison.js';

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
  ) {}

  /**
   * Análise de `from` a `to` (inclusivo, máx. 366 dias), comparada com o período anterior.
   *
   * @example await service.forRange('2026-09-01', '2026-09-30');
   */
  async forRange(
    rawFrom: string | undefined,
    rawTo: string | undefined,
  ): Promise<AnalyticsReport> {
    const { from, to } = parseDateRange(rawFrom, rawTo);
    const previous = previousRange(from, to);
    const closings = await this.closings.listBetween(from, to);
    const before = await this.closings.listBetween(previous.from, previous.to);
    const [orders, previousOrders, lanches, paymentMethods] = await Promise.all(
      [
        this.source.listOrders(idsOf(closings)),
        this.totals.listOrders(idsOf(before)),
        this.source.listMenuLanches(),
        this.methods.listPaymentMethods(),
      ],
    );
    return buildAnalyticsReport({
      from,
      to,
      previous,
      closings,
      orders,
      previousOrders,
      lanches,
      paymentMethods,
    });
  }
}
