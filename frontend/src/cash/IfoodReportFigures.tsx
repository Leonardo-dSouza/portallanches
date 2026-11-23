import type { IfoodReport } from '../api/report-types';
import { formatMoney } from '../api/money';
import { Figure } from './PaymentFigures';

/** "1 pedido", "3 pedidos". */
const ordersLabel = (count: number) =>
  count === 1 ? '1 pedido' : `${count} pedidos`;

/**
 * O iFood à parte (2026-11-23): o cliente quer ver o canal isolado das vendas, porque a comissão
 * é alta e o líquido fica bem abaixo do bruto. Some sem pedido do iFood. O caixa vê só a
 * quantidade; o admin, o bruto, a comissão e o líquido estimados.
 *
 * @example <IfoodReportFigures ifood={report.ifood} />
 */
export function IfoodReportFigures({ ifood }: { ifood?: IfoodReport }) {
  if (!ifood || ifood.count === 0) return null;
  const { gross, commission, net } = ifood;
  return (
    <section className="report-section">
      <h2>iFood</h2>
      <dl className="report">
        {gross === undefined ? (
          <Figure label="Pedidos do iFood" value={String(ifood.count)} />
        ) : (
          <Figure
            label={`Bruto (${ordersLabel(ifood.count)})`}
            value={formatMoney(gross)}
          />
        )}
        {commission !== undefined && (
          <Figure
            nested
            label="Comissão estimada"
            value={`− ${formatMoney(commission)}`}
          />
        )}
        {net !== undefined && (
          <Figure label="Líquido estimado" value={formatMoney(net)} />
        )}
      </dl>
      <p className="hint">
        Fora das vendas e da gaveta: o iFood paga no repasse.
      </p>
    </section>
  );
}
