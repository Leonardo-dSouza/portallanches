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

/** Nota da linha de cima no `<dl className="report">`, na largura toda: não divide coluna com o valor. */
export function FigureNote({ text }: { text: string }) {
  return <dd className="report-note">{text}</dd>;
}

/**
 * Uma forma de pagamento e, nas maquininhas, o subtotal de cada meio logo abaixo. A forma fiado
 * não vem aqui desde 2026-11-01: o recebido dela já entra na forma em que foi pago.
 */
export function PaymentFigures({ entry }: { entry: PaymentMethodTotal }) {
  return (
    <>
      <Figure
        label={`${entry.name} (${entry.ordersCount})`}
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
