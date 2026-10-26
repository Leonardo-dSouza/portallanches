import { useState } from 'react';
import type { CashApi } from '../api/cash-api';
import type { FiadoOrderView, FiadoPayment } from '../api/fiado-types';
import { EmptyState } from '../components/EmptyState';
import { Skeleton } from '../components/Skeleton';
import { FiadoDialogs } from '../cash/FiadoDialogs';
import type { CashDay } from '../cash/use-cash-day';
import { useFiadoDialogs } from '../cash/use-fiado-dialogs';
import { CancelFiadoPaymentDialog } from './CancelFiadoPaymentDialog';
import { DebtorList } from './DebtorList';
import { FiadoOrderDialog } from './FiadoOrderDialog';
import {
  FiadoStatementPanel,
  type StatementActions,
} from './FiadoStatementPanel';
import { useFiadoStatement } from './use-fiado-statement';

interface TabProps {
  cash: CashApi;
  day: CashDay;
  onChanged(): void;
}

interface StatementAreaProps {
  day: CashDay;
  customerId: number | null;
  actions: StatementActions;
  statement: ReturnType<typeof useFiadoStatement>;
}

function StatementArea({
  day,
  customerId,
  actions,
  statement,
}: StatementAreaProps) {
  if (customerId === null)
    return (
      <EmptyState
        title="Escolha um cliente"
        hint="O extrato mostra quanto falta pagar, o que já foi pago e a data combinada."
      />
    );
  if (statement.error)
    return (
      <p className="form-error" role="alert">
        {statement.error}
      </p>
    );
  if (!statement.statement) return <Skeleton label="Carregando o extrato…" />;
  return (
    <FiadoStatementPanel
      statement={statement.statement}
      methods={day.paymentMethods}
      {...actions}
    />
  );
}

/**
 * Aba Fiado do caixa (2026-10-25): quem deve à esquerda, o extrato do escolhido à direita, com
 * Receber, Remarcar, Ver e Estornar. Cada passo relê o extrato e o dia (as listas e o relatório).
 */
export function FiadoTab({ cash, day, onChanged }: TabProps) {
  const [customerId, setCustomerId] = useState<number | null>(null);
  const statement = useFiadoStatement(cash, customerId);
  const dialogs = useFiadoDialogs();
  const [viewing, setViewing] = useState<FiadoOrderView | null>(null);
  const [canceling, setCanceling] = useState<FiadoPayment | null>(null);
  const changed = () => {
    onChanged();
    statement.reload();
  };
  const actions: StatementActions = {
    locked: day.closing.status === 'CLOSED',
    onReceive: dialogs.receive,
    onReschedule: dialogs.reschedule,
    onView: setViewing,
    onCancelPayment: setCanceling,
  };
  return (
    <div className="cash-grid fiado-grid">
      <DebtorList
        debtors={day.fiadoDebtors}
        today={day.closing.businessDate}
        selectedId={customerId}
        onSelect={setCustomerId}
      />
      <StatementArea
        day={day}
        customerId={customerId}
        actions={actions}
        statement={statement}
      />
      <FiadoDialogs cash={cash} day={day} state={dialogs} onChanged={changed} />
      {canceling && (
        <CancelFiadoPaymentDialog
          cash={cash}
          payment={canceling}
          onCanceled={() => {
            setCanceling(null);
            changed();
          }}
          onClose={() => setCanceling(null)}
        />
      )}
      {viewing && (
        <FiadoOrderDialog
          cash={cash}
          order={viewing}
          customerName={statement.statement?.customer.name ?? ''}
          methods={day.paymentMethods}
          onClose={() => setViewing(null)}
        />
      )}
    </div>
  );
}
