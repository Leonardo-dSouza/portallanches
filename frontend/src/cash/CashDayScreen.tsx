import { useMemo, useState } from 'react';
import { useApi } from '../api/api-context';
import { createCashApi } from '../api/cash-api';
import { Skeleton } from '../components/Skeleton';
import { CashHeader } from './CashHeader';
import { CashTabs, type TabId } from './CashTabs';
import { ExpensesTab } from './ExpensesTab';
import { OrdersTab } from './OrdersTab';
import { ReportTab } from './ReportTab';
import { useCashDay } from './use-cash-day';

interface CashDayScreenProps {
  /** Data escolhida (`YYYY-MM-DD`) ou `null` para o "hoje" do servidor. */
  date: string | null;
  onPickDate(date: string | null): void;
}

function LoadFailure({
  message,
  date,
  onPickDate,
}: CashDayScreenProps & { message: string }) {
  return (
    <div className="form-error" role="alert">
      <p>{message}</p>
      {date !== null && (
        <button
          type="button"
          className="button-ghost"
          onClick={() => onPickDate(null)}
        >
          Voltar para hoje
        </button>
      )}
    </div>
  );
}

/** Um dia do caixa (pedidos, gastos, relatório); remontado a cada data para não misturar dias. */
export function CashDayScreen({ date, onPickDate }: CashDayScreenProps) {
  const api = useApi();
  const cash = useMemo(() => createCashApi(api, date), [api, date]);
  const { day, error, reload } = useCashDay(cash);
  const [tab, setTab] = useState<TabId>('orders');
  if (!day && error)
    return <LoadFailure message={error} date={date} onPickDate={onPickDate} />;
  if (!day) return <Skeleton label="Carregando…" rows={4} />;
  const props = { cash, day, onChanged: () => void reload() };
  return (
    <section>
      <CashHeader
        day={day}
        isToday={date === null}
        onRefresh={() => void reload()}
        onPickDate={onPickDate}
      />
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <CashTabs
        active={tab}
        counts={{ orders: day.orders.length, expenses: day.expenses.length }}
        onSelect={setTab}
      />
      <div key={tab} className="tab-panel">
        {tab === 'orders' && <OrdersTab {...props} />}
        {tab === 'expenses' && <ExpensesTab {...props} />}
        {tab === 'report' && <ReportTab {...props} />}
      </div>
    </section>
  );
}
