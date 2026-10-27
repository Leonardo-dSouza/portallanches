import type { CashApi } from '../api/cash-api';
import { ReceiveFiadoDialog } from './ReceiveFiadoDialog';
import { RescheduleFiadoDialog } from './RescheduleFiadoDialog';
import type { CashDay } from './use-cash-day';
import type { FiadoDialogsState } from './use-fiado-dialogs';

interface FiadoDialogsProps {
  cash: CashApi;
  day: CashDay;
  state: FiadoDialogsState;
  /** Depois de receber ou remarcar: recarrega o dia. */
  onChanged(): void;
}

/** As janelas do fiado (Receber e Remarcar), abertas pela lista ou pela aba Fiado. */
export function FiadoDialogs({
  cash,
  day,
  state,
  ...props
}: FiadoDialogsProps) {
  const changed = () => {
    state.close();
    props.onChanged();
  };
  return (
    <>
      {state.receiving && (
        <ReceiveFiadoDialog
          cash={cash}
          target={state.receiving}
          methods={day.paymentMethods}
          onReceived={changed}
          onClose={state.close}
        />
      )}
      {state.rescheduling && (
        <RescheduleFiadoDialog
          cash={cash}
          target={state.rescheduling}
          today={day.closing.businessDate}
          onRescheduled={changed}
          onClose={state.close}
        />
      )}
    </>
  );
}
