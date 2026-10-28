import { CalendarCheck } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import type { CashApi } from '../api/cash-api';
import { errorMessage } from '../api/error-message';
import { OptionalDateField } from '../calendar/OptionalDateField';
import { Dialog } from '../components/Dialog';
import { fiadoSummary, type FiadoTarget } from './fiado-labels';

interface RescheduleFiadoDialogProps {
  cash: CashApi;
  target: FiadoTarget;
  /** A noite do caixa: o calendário abre nela. */
  today: string;
  onRescheduled(): void;
  onClose(): void;
}

/**
 * Remarcar a previsão do fiado (2026-10-25): outra data ou "Sem data". Não pede senha (não mexe
 * em dinheiro); a data não pode ser antes da noite do pedido.
 */
export function RescheduleFiadoDialog(props: RescheduleFiadoDialogProps) {
  const { cash, target } = props;
  const [dueDate, setDueDate] = useState(target.dueDate ?? '');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const save = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      await cash.rescheduleFiado(target.orderId, dueDate || null);
      props.onRescheduled();
    } catch (failure) {
      setError(errorMessage(failure));
    }
    setBusy(false);
  };
  return (
    <Dialog
      title={`Reagendar pagamento: ${target.customerName}`}
      onClose={props.onClose}
    >
      <form className="fiado-dialog" onSubmit={(event) => void save(event)}>
        <p className="hint">{fiadoSummary(target)}</p>
        <OptionalDateField
          label="Pagar em"
          emptyText="Sem data"
          value={dueDate}
          today={props.today}
          notBefore={target.businessDate}
          onChange={setDueDate}
        />
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <div className="dialog-actions">
          <button
            type="submit"
            className="button"
            disabled={busy}
            aria-busy={busy}
          >
            <CalendarCheck aria-hidden />
            Reagendar pagamento
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
