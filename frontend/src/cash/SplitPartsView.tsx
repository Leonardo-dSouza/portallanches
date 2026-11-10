import { formatMoney } from '../api/money';
import type { Order, PaymentMethod } from '../api/types';
import { describePayment } from './payment-choice';
import { Figure } from './PaymentFigures';
import {
  describePaymentPart,
  isSplitOrder,
  splitPartMethod,
} from './split-payment';

// Quanto foi em cada forma no pedido dividido (2026-11-10, pedido do dono: a lista só dizia
// "Pago · dividido" e o pop-up juntava tudo numa linha com "+").

interface SplitPartsViewProps {
  order: Order;
  methods: PaymentMethod[];
}

/**
 * Na lista: uma linha pequena por parte embaixo da etiqueta "Pago · dividido".
 *
 * @example <SplitPartLines order={order} methods={day.paymentMethods} />
 */
export function SplitPartLines({ order, methods }: SplitPartsViewProps) {
  if (!isSplitOrder(order)) return null;
  return (
    <span className="split-part-lines">
      {order.paymentParts.map((part, index) => (
        <span key={index} className="cell-sub">
          {describePaymentPart(part, methods)}
        </span>
      ))}
    </span>
  );
}

/**
 * No pop-up: "Pagamento: Dividido" e cada forma numa linha recuada, com o valor à direita.
 *
 * @example <SplitPartFigures order={order} methods={day.paymentMethods} />
 */
export function SplitPartFigures({ order, methods }: SplitPartsViewProps) {
  return (
    <>
      <Figure label="Pagamento" value="Dividido" />
      {order.paymentParts.map((part, index) => (
        <Figure
          key={index}
          nested
          label={describePayment(
            splitPartMethod(part, methods),
            part.paymentMode,
          )}
          value={formatMoney(part.amount)}
        />
      ))}
    </>
  );
}
