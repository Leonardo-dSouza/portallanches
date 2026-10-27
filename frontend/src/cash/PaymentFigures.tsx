import { formatMoney } from '../api/money';
import type { PaymentMethodTotal } from '../api/types';
import { paymentModeLabel } from './payment-choice';

interface FigureProps {
  label: string;
  value: string;
  /** Subtotal de um meio da maquininha, recuado sob a forma. */
  nested?: boolean;
}

/** Par rótulo/valor de um `<dl className="report">` (relatório do dia e análise). */
export function Figure({ label, value, nested = false }: FigureProps) {
  const className = nested ? 'report-nested' : undefined;
  return (
    <>
      <dt className={className}>{label}</dt>
      <dd className={className}>{value}</dd>
    </>
  );
}

/**
 * Uma forma de pagamento e, nas maquininhas, o subtotal de cada meio logo abaixo. A forma fiado
 * (2026-10-25) conta na venda, mas o dinheiro ainda não entrou: "não pago" (2026-10-27).
 */
export function PaymentFigures({ entry }: { entry: PaymentMethodTotal }) {
  const label = `${entry.name} (${entry.ordersCount})`;
  return (
    <>
      <Figure
        label={entry.isFiado ? `${label}, não pago` : label}
        value={formatMoney(entry.total)}
      />
      {entry.byMode.map((sub) => (
        <Figure
          key={sub.mode}
          nested
          label={`${paymentModeLabel(sub.mode)} (${sub.ordersCount})`}
          value={formatMoney(sub.total)}
        />
      ))}
    </>
  );
}
