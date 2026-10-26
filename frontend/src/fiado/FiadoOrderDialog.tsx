import type { CashApi } from '../api/cash-api';
import type { FiadoOrderView } from '../api/fiado-types';
import type { PaymentMethod } from '../api/types';
import { Dialog } from '../components/Dialog';
import { fiadoAmounts, fiadoOrderLabel } from '../cash/fiado-labels';
import { OrderHistory } from '../cash/OrderHistory';

interface FiadoOrderDialogProps {
  cash: CashApi;
  order: FiadoOrderView;
  customerName: string;
  methods: PaymentMethod[];
  onClose(): void;
}

/**
 * O "Ver" do extrato: o pedido fiado de outra noite pelo histórico (lançado com os itens, os
 * recebimentos, os estornos e as previsões remarcadas).
 */
export function FiadoOrderDialog(props: FiadoOrderDialogProps) {
  const { order } = props;
  return (
    <Dialog title={fiadoOrderLabel(order)} onClose={props.onClose}>
      <p className="hint">
        {props.customerName} · {fiadoAmounts(order)}
      </p>
      <OrderHistory
        cash={props.cash}
        orderId={order.orderId}
        methods={props.methods}
      />
    </Dialog>
  );
}
