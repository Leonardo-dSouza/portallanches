import type { ReactNode } from 'react';
import { formatMoney } from '../api/money';
import type { ConsumptionCost } from '../api/staff-consumption-types';
import type { CanceledOrderLine } from '../api/report-types';
import type { ClosingReport } from '../api/types';
import { costOf } from '../staff-consumption/consumption-cost';
import { DrawerFigures } from './DrawerFigures';
import { FiadoReceivedFigures, FiadoSoldFigures } from './FiadoReportFigures';
import { Figure, PaymentFigures, SplitOrdersNote } from './PaymentFigures';

/** @example deliveriesLabel(1) // '1 entrega' */
const deliveriesLabel = (count: number) =>
  count === 1 ? '1 entrega' : `${count} entregas`;

/**
 * O A pagar da noite aberta, à parte e fora do faturamento até receber (card 8, 2026-11-08: o
 * Faturamento somava o que ainda não tinha entrado). Desde então o "sem forma" é só o importado.
 */
function OpenAccountsFigure({ report }: { report: ClosingReport }) {
  const open = report.openAccounts;
  if (!open || open.count === 0) return null;
  return (
    <dl className="report report-open-accounts">
      <Figure
        label={`A receber (A pagar) (${open.count}), fora do faturamento`}
        value={formatMoney(open.total)}
      />
    </dl>
  );
}

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

/** O recebido de fiado da noite, só quando tem (2026-11-01). */
function ReceivedLine({ report }: { report: ClosingReport }) {
  const { count, received } = report.fiadoReceived;
  if (count === 0) return null;
  return (
    <Figure
      nested
      label={`Recebido de fiado (${count})`}
      value={formatMoney(received)}
    />
  );
}

/**
 * Vendas (2026-11-01): o faturamento, feito dos pedidos sem o fiado e do recebido de fiado, tudo
 * que entrou em cada forma e, por último, os cancelados com o motivo. O fiado vendido na noite
 * tem quadro próprio, porque não entra aqui.
 */
function SalesFigures({ report }: { report: ClosingReport }) {
  const revenue = report.revenue ? formatMoney(report.revenue) : '—';
  return (
    <section className="report-section">
      <h2>Vendas</h2>
      <dl className="report">
        <Figure label="Faturamento" value={revenue} />
        {report.ordersWithoutFiado && (
          <Figure
            nested
            label={`Pedidos (${report.ordersWithoutFiado.count})`}
            value={formatMoney(report.ordersWithoutFiado.total)}
          />
        )}
        <ReceivedLine report={report} />
      </dl>
      <dl className="report report-sub">
        {report.byPaymentMethod?.map((entry) => (
          <PaymentFigures key={entry.paymentMethodId} entry={entry} />
        ))}
        {report.withoutPaymentMethod &&
          report.withoutPaymentMethod.count > 0 && (
            <Figure
              label={`Sem forma de pagamento (${report.withoutPaymentMethod.count})`}
              value={formatMoney(report.withoutPaymentMethod.total)}
            />
          )}
        <SplitOrdersNote count={report.splitOrdersCount ?? 0} />
      </dl>
      <OpenAccountsFigure report={report} />
      <CanceledFigures canceled={report.canceled} />
    </section>
  );
}

export interface ReportFiguresProps {
  report: ClosingReport;
  action?: ReactNode;
}

/**
 * Os totais do fechamento em quadros (vendas, conferência, fiado da noite, recebido de fiado,
 * entregas e motoboy, gastos e o consumo interno): o relatório do Caixa e o resumo do dia na
 * Análise.
 */
export function ReportFigures({ report, action }: ReportFiguresProps) {
  return (
    <div className="report-sections">
      {report.byPaymentMethod ? (
        <SalesFigures report={report} />
      ) : (
        // Contagem cega (card 7): o caixa vê as vendas só depois de fechar o dia.
        <section className="report-section">
          <h2>Vendas</h2>
          <p className="hint">
            As vendas aparecem depois de fechar (contagem cega).
          </p>
        </section>
      )}
      <DrawerFigures
        drawer={report.drawer}
        status={report.status}
        action={action}
      />
      <FiadoSoldFigures report={report} />
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
