import {
  centsToMoney,
  formatMoney,
  moneyToCents,
  toApiMoney,
} from '../api/money';
import type { Order } from '../api/types';
import { previewTotalCents } from './order-lines';
import type { OrderFormState } from './use-order-form';

interface OrderTotalsProps {
  form: OrderFormState;
  editing: Order | null;
}

/** Na edição (2026-10-15): o valor salvo, o de agora e a diferença, antes de salvar. */
function EditDifference({
  editing,
  totalCents,
}: {
  editing: Order | null;
  totalCents: number;
}) {
  if (!editing) return null;
  const diff = totalCents - moneyToCents(editing.amount);
  const sign = diff > 0 ? '+' : diff < 0 ? '−' : '';
  return (
    <p className="edit-difference" data-direction={Math.sign(diff)}>
      Antes {formatMoney(editing.amount)} → agora{' '}
      {formatMoney(centsToMoney(totalCents))}
      {diff !== 0 && ` (${sign}${formatMoney(centsToMoney(Math.abs(diff)))})`}
    </p>
  );
}

/**
 * Resumo de valores da comanda: no balcão só o Total; na entrega detalha Itens e Taxa.
 * Mostra também a diferença em relação ao valor anterior quando em edição.
 */
export function OrderTotals({ form, editing }: OrderTotalsProps) {
  const isDelivery = form.values.type === 'DELIVERY';
  const fee = isDelivery ? (toApiMoney(form.values.fee) ?? '') : '';
  const allLines = [...(form.baseLines ?? []), ...form.items.lines];
  const items = previewTotalCents(allLines, '');
  const totalCents = previewTotalCents(allLines, fee);

  return (
    <>
      <dl className="order-totals">
        {isDelivery && (
          <>
            <dt>Itens</dt>
            <dd>{formatMoney(centsToMoney(items))}</dd>
            <dt>Taxa</dt>
            <dd>{formatMoney(fee || '0.00')}</dd>
          </>
        )}
        <dt className="order-total-label">Total</dt>
        <dd className="order-total">{formatMoney(centsToMoney(totalCents))}</dd>
      </dl>
      <EditDifference editing={editing} totalCents={totalCents} />
    </>
  );
}
