import { formatMoney } from '../api/money';
import type { ClosingReport } from '../api/types';
import { Figure, PaymentFigures } from './PaymentFigures';

/**
 * Os totais do fechamento em três quadros (vendas, entregas e motoboy, gastos): o relatório
 * do Caixa e o resumo do dia na Análise.
 */
export function ReportFigures({ report }: { report: ClosingReport }) {
  return (
    <div className="report-sections">
      <section className="report-section">
        <h2>Vendas</h2>
        <dl className="report">
          <Figure
            label={`Pedidos (${report.orders.count})`}
            value={formatMoney(report.orders.total)}
          />
        </dl>
        <dl className="report report-sub">
          {report.byPaymentMethod.map((entry) => (
            <PaymentFigures key={entry.paymentMethodId} entry={entry} />
          ))}
          {report.withoutPaymentMethod.count > 0 && (
            <Figure
              label={`Sem forma de pagamento (${report.withoutPaymentMethod.count})`}
              value={formatMoney(report.withoutPaymentMethod.total)}
            />
          )}
        </dl>
      </section>
      <section className="report-section">
        <h2>Entregas e motoboy</h2>
        <dl className="report">
          <Figure
            label={`Entregas (${report.delivery.count}): taxas`}
            value={formatMoney(report.delivery.feesTotal)}
          />
          <Figure
            label={`Motoboy: diária ${formatMoney(report.motoboy.dailyRate)} + taxas`}
            value={formatMoney(report.motoboy.totalCost)}
          />
        </dl>
      </section>
      <section className="report-section">
        <h2>Gastos</h2>
        <dl className="report">
          <Figure
            label={`Gastos (${report.expenses.count})`}
            value={formatMoney(report.expenses.total)}
          />
        </dl>
      </section>
    </div>
  );
}
