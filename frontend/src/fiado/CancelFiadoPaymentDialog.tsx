import { Undo2 } from 'lucide-react';
import type { FormEvent } from 'react';
import type { CashApi } from '../api/cash-api';
import type { FiadoPayment } from '../api/fiado-types';
import { formatMoney, moneyToCents } from '../api/money';
import { Dialog } from '../components/Dialog';
import { fiadoOrderLabel } from '../cash/fiado-labels';
import { ManagerField, ReasonField } from '../cash/ManagerCancelFields';
import { useManagerCancel } from '../cash/use-manager-cancel';
import { formatDayMonth } from '../history/date-keys';

/** Os motivos que mais aparecem num estorno: um clique preenche. */
const QUICK_REVERSAL_REASONS = [
  'Lançado errado',
  'Forma errada',
  'Valor errado',
] as const;

interface CancelFiadoPaymentDialogProps {
  cash: CashApi;
  payment: FiadoPayment;
  onCanceled(): void;
  onClose(): void;
}

/** O que muda com o estorno: o valor volta a faltar e sai da gaveta da noite em que entrou. */
function reversalHint(payment: FiadoPayment): string {
  const extra =
    moneyToCents(payment.extra) > 0
      ? ` O adicional de ${formatMoney(payment.extra)} sai junto.`
      : '';
  return `Volta a faltar ${formatMoney(payment.amount)} no pedido e sai da gaveta da noite de ${formatDayMonth(payment.businessDate)}.${extra}`;
}

/**
 * Estornar um recebimento do fiado (2026-10-25), com a mesma trava do cancelar: motivo e, fora
 * dos minutos do caixa, a senha do admin. Noite fechada é com o admin (a API recusa).
 */
export function CancelFiadoPaymentDialog(props: CancelFiadoPaymentDialogProps) {
  const { cash, payment } = props;
  const state = useManagerCancel(
    payment,
    {
      what: 'estorno',
      run: (reason, password) =>
        cash.cancelFiadoPayment(payment.id, reason, password),
    },
    props.onCanceled,
  );
  const submit = (event: FormEvent) => {
    event.preventDefault();
    void state.submit();
  };
  const order = {
    dayNumber: payment.orderDayNumber,
    businessDate: payment.orderBusinessDate,
  };
  return (
    <Dialog
      title={`Estornar ${formatMoney(payment.amount)} do ${fiadoOrderLabel(order)}`}
      onClose={props.onClose}
    >
      <form className="cancel-order" onSubmit={submit}>
        <p className="hint">{reversalHint(payment)}</p>
        <ReasonField
          state={state}
          quickReasons={QUICK_REVERSAL_REASONS}
          label="Motivo do estorno"
        />
        <ManagerField
          state={state}
          lockHint="O recebimento já passou do tempo da trava do caixa: precisa da senha do admin."
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
            <Undo2 aria-hidden />
            Estornar
          </button>
          <button
            type="button"
            className="button button-secondary"
            onClick={props.onClose}
          >
            Voltar
          </button>
        </div>
      </form>
    </Dialog>
  );
}
