import { formatMoney } from '../api/money';
import type { ClosingReport } from '../api/types';
import { Figure, PaymentFigures } from './PaymentFigures';

/**
 * Recebido de fiado na noite (2026-10-25): por forma e o adicional à parte. A venda contou na
 * noite em que foi vendida; aqui é só o dinheiro que entrou.
 */
export function FiadoReceivedFigures({ report }: { report: ClosingReport }) {
  const received = report.fiadoReceived;
  if (!received || received.count === 0) return null;
  return (
    <section className="report-section">
      <h2>Recebido de fiado</h2>
      <dl className="report">
        <Figure
          label={`Recebido (${received.count})`}
          value={formatMoney(received.total)}
        />
      </dl>
      <dl className="report report-sub">
        {received.byPaymentMethod.map((entry) => (
          <PaymentFigures key={entry.paymentMethodId} entry={entry} />
        ))}
        <Figure label="Adicional" value={formatMoney(received.extra)} />
      </dl>
      <p className="hint">Não conta de novo como venda.</p>
    </section>
  );
}

/**
 * O que entrou na gaveta na noite: as vendas pagas (sem o fiado a receber nem o A pagar), o
 * recebido de fiado e o adicional. Só no relatório do dia (o período não tem).
 */
export function DrawerFigures({ report }: { report: ClosingReport }) {
  if (report.cashIn === undefined) return null;
  return (
    <section className="report-section">
      <h2>Gaveta</h2>
      <dl className="report">
        <Figure label="Entrou no caixa" value={formatMoney(report.cashIn)} />
      </dl>
      <p className="hint">
        Vendas pagas, recebido de fiado e adicional. Gastos e motoboy à parte.
      </p>
    </section>
  );
}
