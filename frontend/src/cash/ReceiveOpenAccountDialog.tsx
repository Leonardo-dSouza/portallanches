import { HandCoins } from 'lucide-react';
import { useRef, type FormEvent, type KeyboardEvent } from 'react';
import type { CashApi } from '../api/cash-api';
import { formatMoney } from '../api/money';
import type { Order, PaymentMethod } from '../api/types';
import { Dialog } from '../components/Dialog';
import { TextField } from '../components/TextField';
import { PaymentKeys } from './PaymentKeys';
import { receiveMethods } from './receive-fiado-values';
import { isCashChoice } from './receive-open-account-values';
import { useReceiveOpenAccount } from './use-receive-open-account';

interface ReceiveOpenAccountDialogProps {
  cash: CashApi;
  order: Order;
  methods: PaymentMethod[];
  onReceived(order: Order): void;
  onClose(): void;
}

/** Enter no "Troco para" salva, como na comanda. */
function submitOnEnterKey(
  event: KeyboardEvent<HTMLInputElement>,
  submit: () => void,
): void {
  if (event.key !== 'Enter' || event.ctrlKey) return;
  event.preventDefault();
  submit();
}

/**
 * Receber o A pagar sem abrir o Editar (card 8, 2026-11-08), pelo teclado: tecla da forma (1 a
 * N) → [meio da maquininha] → Enter salva; no dinheiro, o foco vai ao "Troco para". Sem a forma
 * fiado: virar fiado pede o cliente, e isso é pelo Editar. Trocar só a forma não imprime.
 */
export function ReceiveOpenAccountDialog(props: ReceiveOpenAccountDialogProps) {
  const { order, methods } = props;
  const state = useReceiveOpenAccount(
    props.cash,
    order,
    methods,
    props.onReceived,
  );
  const keysRef = useRef<HTMLFieldSetElement>(null);
  const changeRef = useRef<HTMLInputElement>(null);
  const send = () => void state.submit();
  const submit = (event: FormEvent) => {
    event.preventDefault();
    send();
  };
  return (
    <Dialog
      title={`Receber: ${order.customerName ?? `#${order.dayNumber}`}`}
      onClose={props.onClose}
    >
      <form className="fiado-dialog" onSubmit={submit}>
        <p className="hint">
          #{order.dayNumber} · {formatMoney(order.amount)}
        </p>
        <PaymentKeys
          methods={receiveMethods(methods)}
          value={state.values.paymentMethodId}
          mode={state.values.paymentMode}
          onChange={(value) => state.setField('paymentMethodId', value)}
          onModeChange={(mode) => state.setField('paymentMode', mode)}
          onSubmit={send}
          onCashChosen={() => changeRef.current?.focus()}
          groupRef={keysRef}
          autoFocus
        />
        {isCashChoice(state.values, methods) && (
          <TextField
            label="Troco para"
            inputMode="decimal"
            ref={changeRef}
            placeholder="Vazio = sem troco"
            value={state.values.changeFor}
            onChange={(value) => state.setField('changeFor', value)}
            onKeyDown={(event) => submitOnEnterKey(event, send)}
          />
        )}
        {state.error && (
          <p className="form-error" role="alert">
            {state.error}
          </p>
        )}
        <div className="dialog-actions">
          <button
            type="submit"
            className="button"
            disabled={state.busy}
            aria-busy={state.busy}
          >
            <HandCoins aria-hidden />
            Receber pagamento
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
