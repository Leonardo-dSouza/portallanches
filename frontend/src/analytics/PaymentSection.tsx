import type { AnalyticsReport } from '../api/analytics-types';
import { formatMoney } from '../api/money';
import { Figure, PaymentFigures } from '../cash/PaymentFigures';
import { AnalyticsSection } from './AnalyticsSection';

type PaymentData = Pick<
  AnalyticsReport,
  'byPaymentMethod' | 'withoutPaymentMethod' | 'fiadoToReceive'
>;

/**
 * Quanto entrou por forma de pagamento, com crédito, débito e PIX de cada maquininha. O recebido
 * de fiado soma na forma; o que falta dos fiados do período vem por último (2026-11-01).
 */
export function PaymentSection({ report }: { report: PaymentData }) {
  const { withoutPaymentMethod, fiadoToReceive } = report;
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
        {fiadoToReceive.count > 0 && (
          <Figure
            label={`Fiado a receber (${fiadoToReceive.count})`}
            value={formatMoney(fiadoToReceive.total)}
          />
        )}
      </dl>
    </AnalyticsSection>
  );
}
