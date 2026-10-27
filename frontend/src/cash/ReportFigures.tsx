import { formatMoney } from '../api/money';
import type { ConsumptionCost } from '../api/staff-consumption-types';
import type { CanceledOrderLine } from '../api/report-types';
import type { ClosingReport } from '../api/types';
import { costOf } from '../staff-consumption/consumption-cost';
import { FiadoReceivedFigures } from './FiadoReportFigures';
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

/** A frase do bloco: com o custo (admin), avisa também os itens sem custo (açaí). */
function consumptionHint(cost: ConsumptionCost | null): string {
  if (!cost) return 'Fora dos gastos (não sai da gaveta).';
  const missing =
    cost.missingCostCount > 0
      ? ` ${missingCostLabel(cost.missingCostCount)} (sem composição no Cardápio, como o açaí).`
      : '';
  return `Pelo custo dos itens, fora dos gastos (não sai da gaveta).${missing}`;
}

/**
 * Consumo interno (2026-10-23): pelo custo dos itens e à parte dos gastos, porque não saiu
 * dinheiro da gaveta. Item sem composição no Cardápio (açaí) entra sem custo. O custo só vem
 * para o admin (2026-10-25); o caixa vê quantos lançamentos fez.
 */
function StaffConsumptionFigures({ report }: { report: ClosingReport }) {
  const staff = report.staffConsumption;
  if (!staff || staff.count === 0) return null;
  const cost = costOf(staff);
  const label = cost
    ? `Custo (${consumptionsLabel(staff.count)})`
    : 'Lançamentos';
  return (
    <section className="report-section">
      <h2>Consumo interno</h2>
      <dl className="report">
        <Figure
          label={label}
          value={cost ? formatMoney(cost.cmvTotal) : String(staff.count)}
        />
      </dl>
      <p className="hint">{consumptionHint(cost)}</p>
    </section>
  );
}

/** @example canceledLabel({ dayNumber: 12, reason: 'Pedido duplicado', … }) // '#12 Pedido duplicado' */
const canceledLabel = (line: CanceledOrderLine) =>
  line.reason ? `#${line.dayNumber} ${line.reason}` : `#${line.dayNumber}`;

/** Fora do total de cima (2026-10-15), cada um com o número e o motivo (2026-10-27). */
function CanceledFigures({ canceled }: Pick<ClosingReport, 'canceled'>) {
  if (!canceled || canceled.count === 0) return null;
  return (
    <dl className="report report-canceled">
      <Figure
        label={`Cancelados (${canceled.count}), fora do total`}
        value={formatMoney(canceled.total)}
      />
      {canceled.orders.map((line) => (
        <Figure
          key={line.dayNumber}
          nested
          label={canceledLabel(line)}
          value={formatMoney(line.amount)}
        />
      ))}
    </dl>
  );
}

/**
 * Vendas (pedido do usuário, 2026-10-27): os pedidos sem o fiado, o fiado da noite (não pago)
 * logo abaixo, as formas de pagamento e, por último, os cancelados com o motivo.
 */
function SalesFigures({ report }: { report: ClosingReport }) {
  const fiado = report.byPaymentMethod.find((entry) => entry.isFiado);
  const paid = report.byPaymentMethod.filter((entry) => !entry.isFiado);
  return (
    <section className="report-section">
      <h2>Vendas</h2>
      <dl className="report">
        <Figure
          label={`Pedidos (${report.ordersWithoutFiado.count})`}
          value={formatMoney(report.ordersWithoutFiado.total)}
        />
        {fiado && <PaymentFigures entry={fiado} />}
      </dl>
      <dl className="report report-sub">
        {paid.map((entry) => (
          <PaymentFigures key={entry.paymentMethodId} entry={entry} />
        ))}
        {report.withoutPaymentMethod.count > 0 && (
          <Figure
            label={`${withoutPaymentLabel(report)} (${report.withoutPaymentMethod.count})`}
            value={formatMoney(report.withoutPaymentMethod.total)}
          />
        )}
      </dl>
      <CanceledFigures canceled={report.canceled} />
    </section>
  );
}

/**
 * Os totais do fechamento em quadros (vendas, recebido de fiado, entregas e motoboy, gastos e o
 * consumo interno): o relatório do Caixa e o resumo do dia na Análise. O quadro Gaveta ("Entrou
 * no caixa") saiu a pedido do usuário em 2026-10-27.
 */
export function ReportFigures({ report }: { report: ClosingReport }) {
  return (
    <div className="report-sections">
      <SalesFigures report={report} />
      <FiadoReceivedFigures report={report} />
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
