import { HandCoins } from 'lucide-react';
import { useRef, type FormEvent, type KeyboardEvent } from 'react';
import type { CashApi } from '../api/cash-api';
import type { FiadoReceipt } from '../api/fiado-types';
import type { PaymentMethod } from '../api/types';
import { Dialog } from '../components/Dialog';
import { TextField } from '../components/TextField';
import { focusChoice } from './choice-keys';
import { fiadoSummary, type FiadoTarget } from './fiado-labels';
import { PaymentKeys } from './PaymentKeys';
import { receiveMethods } from './receive-fiado-values';
import { useReceiveFiado } from './use-receive-fiado';

interface ReceiveFiadoDialogProps {
  cash: CashApi;
  target: FiadoTarget;
  methods: PaymentMethod[];
  onReceived(receipt: FiadoReceipt): void;
  onClose(): void;
}

/** Enter no campo vai ao próximo passo (Adicional, depois as teclas), sem salvar pela metade. */
function nextOnEnter(
  event: KeyboardEvent<HTMLInputElement>,
  next: () => void,
): void {
  if (event.key !== 'Enter' || event.ctrlKey) return;
  event.preventDefault();
  next();
}

/**
 * Receber o fiado (2026-10-25), pelo teclado como a comanda: Valor (já com o que falta) →
 * Enter → Adicional → Enter → tecla da forma → Enter salva. Entra na gaveta desta noite e não
 * mexe no estoque.
 */
export function ReceiveFiadoDialog(props: ReceiveFiadoDialogProps) {
  const { target, methods } = props;
  const state = useReceiveFiado(props.cash, target, methods, props.onReceived);
  const extraRef = useRef<HTMLInputElement>(null);
  const keysRef = useRef<HTMLFieldSetElement>(null);
  const submit = (event: FormEvent) => {
    event.preventDefault();
    void state.submit();
  };
  return (
    <Dialog
      title={`Receber pagamento: ${target.customerName}`}
      onClose={props.onClose}
    >
      <form className="fiado-dialog" onSubmit={submit}>
        <p className="hint">{fiadoSummary(target)}</p>
        <div className="field-pair receive-amounts">
          <TextField
            label="Valor"
            inputMode="decimal"
            data-autofocus
            value={state.values.amount}
            onFocus={(event) => event.target.select()}
            onChange={(value) => state.setField('amount', value)}
            onKeyDown={(event) =>
              nextOnEnter(event, () => extraRef.current?.focus())
            }
          />
          <TextField
            label="Adicional (juros)"
            inputMode="decimal"
            ref={extraRef}
            placeholder="Opcional"
            value={state.values.extra}
            onChange={(value) => state.setField('extra', value)}
            onKeyDown={(event) =>
              nextOnEnter(event, () => focusChoice(keysRef.current))
            }
          />
        </div>
        <PaymentKeys
          methods={receiveMethods(methods)}
          value={state.values.paymentMethodId}
          mode={state.values.paymentMode}
          onChange={(value) => state.setField('paymentMethodId', value)}
          onModeChange={(mode) => state.setField('paymentMode', mode)}
          onSubmit={() => void state.submit()}
          groupRef={keysRef}
        />
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
