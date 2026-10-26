import { Ban } from 'lucide-react';
import type { FormEvent } from 'react';
import type { CashApi } from '../api/cash-api';
import { formatMoney } from '../api/money';
import type { Order } from '../api/types';
import { Dialog } from '../components/Dialog';
import { ManagerField, ReasonField } from './ManagerCancelFields';
import { orderTitle } from './order-description';
import { QUICK_CANCEL_REASONS, useCancelOrder } from './use-cancel-order';

interface CancelOrderDialogProps {
  cash: CashApi;
  order: Order;
  onCanceled(): void;
  onClose(): void;
}

/**
 * Cancelar no lugar do antigo "Apagar" (2026-10-15): o pedido fica na lista, riscado, com o
 * motivo; sai dos totais e devolve o estoque. Só o admin desfaz.
 */
export function CancelOrderDialog(props: CancelOrderDialogProps) {
  const { cash, order, onCanceled, onClose } = props;
  const state = useCancelOrder(cash, order, onCanceled);
  const submit = (event: FormEvent) => {
    event.preventDefault();
    void state.submit();
  };
  return (
    <Dialog title={`Cancelar ${orderTitle(order)}`} onClose={onClose}>
      <form className="cancel-order" onSubmit={submit}>
        <p className="hint">
          {formatMoney(order.amount)} · sai do caixa e do estoque, e fica na
          lista em Cancelados.
        </p>
        <ReasonField
          state={state}
          quickReasons={QUICK_CANCEL_REASONS}
          label="Motivo do cancelamento"
        />
        <ManagerField
          state={state}
          lockHint="O pedido já saiu da trava do caixa (passou do tempo ou não está mais em preparo): precisa da senha do admin."
        />
        {state.error && (
          <p className="form-error" role="alert">
            {state.error}
          </p>
        )}
        <div className="dialog-actions">
          <button
            type="submit"
            className="button button-danger"
            disabled={state.busy}
            aria-busy={state.busy}
          >
            <Ban aria-hidden />
            Cancelar pedido
          </button>
          <button
            type="button"
            className="button button-secondary"
            onClick={onClose}
          >
            Voltar
          </button>
        </div>
      </form>
    </Dialog>
  );
}
