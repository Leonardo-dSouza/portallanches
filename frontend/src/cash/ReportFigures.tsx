import { formatMoney } from '../api/money';
import type { ClosingReport } from '../api/types';
import { Figure, PaymentFigures } from './PaymentFigures';

/** @example deliveriesLabel(1) // '1 entrega' */
const deliveriesLabel = (count: number) =>
  count === 1 ? '1 entrega' : `${count} entregas`;

/**
 * No dia aberto, o pedido sem forma é a conta aberta do balcão (2026-10-10); no fechado só
 * sobram os importados da planilha (o dia não fecha com conta aberta).
 */
const withoutPaymentLabel = (report: ClosingReport) =>
  report.status === 'OPEN'
    ? 'Abertos, sem pagamento'
    : 'Sem forma de pagamento';

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
              label={`${withoutPaymentLabel(report)} (${report.withoutPaymentMethod.count})`}
              value={formatMoney(report.withoutPaymentMethod.total)}
            />
          )}
        </dl>
      </section>
      <section className="report-section">
        <h2>Entregas e motoboy</h2>
        {/* Diária primeiro, depois as taxas e o total (pedido do usuário, 2026-10-10). */}
        <dl className="report">
          <Figure
            label="Diária"
            value={formatMoney(report.motoboy.dailyRate)}
          />
          <Figure
            label={`Taxas (${deliveriesLabel(report.delivery.count)})`}
            value={formatMoney(report.delivery.feesTotal)}
          />
          <Figure
            label="Total do motoboy"
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
