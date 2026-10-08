import type { AnalyticsReport } from '../api/analytics-types';
import { formatMoney } from '../api/money';
import { Figure, PaymentFigures } from '../cash/PaymentFigures';
import { AnalyticsSection } from './AnalyticsSection';

type PaymentData = Pick<
  AnalyticsReport,
  'byPaymentMethod' | 'withoutPaymentMethod'
>;

/** Quanto entrou por forma de pagamento, com crédito, débito e PIX de cada maquininha. */
export function PaymentSection({ report }: { report: PaymentData }) {
  const { withoutPaymentMethod } = report;
  return (
    <AnalyticsSection title="Pagamentos">
      <dl className="report">
        {report.byPaymentMethod.map((entry) => (
          <PaymentFigures key={entry.paymentMethodId} entry={entry} />
        ))}
        {withoutPaymentMethod.count > 0 && (
          <Figure
            label={`Sem forma de pagamento (${withoutPaymentMethod.count})`}
            value={formatMoney(withoutPaymentMethod.total)}
          />
        )}
      </dl>
    </AnalyticsSection>
  );
}
