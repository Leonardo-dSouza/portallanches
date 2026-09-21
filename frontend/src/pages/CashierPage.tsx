import { useMemo, useState } from 'react';
import { createCashApi } from '../api/cash-api';
import { useApi } from '../api/api-context';
import { CashHeader } from '../cash/CashHeader';
import { CashTabs, type TabId } from '../cash/CashTabs';
import { ExpensesTab } from '../cash/ExpensesTab';
import { OrdersTab } from '../cash/OrdersTab';
import { ReportTab } from '../cash/ReportTab';
import { Skeleton } from '../components/Skeleton';
import { useCashDay } from '../cash/use-cash-day';

/** Caixa do dia: pedidos, gastos e relatório em abas, com o fechamento no fim. */
export function CashierPage() {
  const api = useApi();
  const cash = useMemo(() => createCashApi(api), [api]);
  const { day, error, reload } = useCashDay(cash);
  const [tab, setTab] = useState<TabId>('orders');
  if (!day)
    return error ? (
      <p className="form-error" role="alert">
        {error}
      </p>
    ) : (
      <Skeleton label="Carregando…" rows={4} />
    );
  const props = { cash, day, onChanged: () => void reload() };
  return (
    <section>
      <CashHeader day={day} onRefresh={() => void reload()} />
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
