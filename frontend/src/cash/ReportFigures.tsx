import { formatMoney } from '../api/money';
import type { ClosingReport } from '../api/types';
import { Figure, PaymentFigures } from './PaymentFigures';

/** @example deliveriesLabel(1) // '1 entrega' */
const deliveriesLabel = (count: number) =>
  count === 1 ? '1 entrega' : `${count} entregas`;

/**
 * No dia aberto, o pedido sem forma é a conta "A pagar" do balcão (2026-10-10); no fechado só
 * sobram os importados da planilha (o dia não fecha com conta a pagar).
 */
const withoutPaymentLabel = (report: ClosingReport) =>
  report.status === 'OPEN' ? 'A pagar' : 'Sem forma de pagamento';

/** @example consumptionsLabel(2) // '2 lançamentos' */
const consumptionsLabel = (count: number) =>
  count === 1 ? '1 lançamento' : `${count} lançamentos`;

/** @example missingCostLabel(1) // '1 item sem custo' */
const missingCostLabel = (count: number) =>
  count === 1 ? '1 item sem custo' : `${count} itens sem custo`;

/**
 * Consumo interno (2026-10-23): pelo custo dos itens e à parte dos gastos, porque não saiu
 * dinheiro da gaveta. Item sem composição no Cardápio (açaí) entra sem custo.
 */
function StaffConsumptionFigures({ report }: { report: ClosingReport }) {
  const staff = report.staffConsumption;
  if (!staff || staff.count === 0) return null;
  return (
    <section className="report-section">
      <h2>Consumo interno</h2>
      <dl className="report">
        <Figure
          label={`Custo (${consumptionsLabel(staff.count)})`}
          value={formatMoney(staff.cmvTotal)}
        />
      </dl>
      <p className="hint">
        Pelo custo dos itens, fora dos gastos (não sai da gaveta).
        {staff.missingCostCount > 0 &&
          ` ${missingCostLabel(staff.missingCostCount)} (sem composição no Cardápio, como o açaí).`}
      </p>
    </section>
  );
}

/**
 * Os totais do fechamento em quadros (vendas, entregas e motoboy, gastos e o consumo interno):
 * o relatório do Caixa e o resumo do dia na Análise.
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
        {/* Fora do total de cima (2026-10-15): o motivo de cada um está no filtro Cancelados. */}
        {report.canceled && report.canceled.count > 0 && (
          <dl className="report report-canceled">
            <Figure
              label={`Cancelados (${report.canceled.count}), fora do total`}
              value={formatMoney(report.canceled.total)}
            />
          </dl>
        )}
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
      <StaffConsumptionFigures report={report} />
    </div>
  );
}
