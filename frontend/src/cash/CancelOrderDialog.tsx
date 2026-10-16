import { Ban } from 'lucide-react';
import type { FormEvent } from 'react';
import type { CashApi } from '../api/cash-api';
import { formatMoney } from '../api/money';
import type { Order } from '../api/types';
import { Dialog } from '../components/Dialog';
import { orderTitle } from './order-description';
import {
  QUICK_CANCEL_REASONS,
  useCancelOrder,
  type CancelOrderState,
} from './use-cancel-order';

interface CancelOrderDialogProps {
  cash: CashApi;
  order: Order;
  onCanceled(): void;
  onClose(): void;
}

function ReasonField({ state }: { state: CancelOrderState }) {
  return (
    <fieldset className="cancel-reason">
      <legend>Motivo</legend>
      <div className="cancel-reason-quick">
        {QUICK_CANCEL_REASONS.map((quick) => (
          <button
            key={quick}
            type="button"
            className="toggle-key toggle-key-sm"
            aria-pressed={state.reason === quick}
            onClick={() => state.setReason(quick)}
          >
            {quick}
          </button>
        ))}
      </div>
      <label className="field">
        <span className="sr-only">Motivo do cancelamento</span>
        <input
          // O `Dialog` foca o motivo ao abrir.
          data-autofocus
          maxLength={200}
          placeholder="Ou escreva o motivo"
          value={state.reason}
          onChange={(event) => state.setReason(event.target.value)}
        />
      </label>
    </fieldset>
  );
}

function ManagerField({ state }: { state: CancelOrderState }) {
  if (!state.askPassword) return null;
  return (
    <>
      <p className="hint">
        O pedido já saiu da trava do caixa (passou do tempo ou não está mais em
        preparo): precisa da senha do admin.
      </p>
      <label className="field">
        Senha do admin
        <input
          type="password"
          autoComplete="off"
          value={state.password}
          onChange={(event) => state.setPassword(event.target.value)}
        />
      </label>
    </>
  );
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
        <ReasonField state={state} />
        <ManagerField state={state} />
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
