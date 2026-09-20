import { useMemo, useState } from 'react';
import { createCashApi } from '../api/cash-api';
import { useApi } from '../api/api-context';
import { ExpensesTab } from '../cash/ExpensesTab';
import { OrdersTab } from '../cash/OrdersTab';
import { ReportTab } from '../cash/ReportTab';
import { useCashDay, type CashDay } from '../cash/use-cash-day';

type TabId = 'orders' | 'expenses' | 'report';

const TABS: { id: TabId; label: string }[] = [
  { id: 'orders', label: 'Pedidos' },
  { id: 'expenses', label: 'Gastos' },
  { id: 'report', label: 'Relatório' },
];

const STATUS_LABEL = { OPEN: 'Aberto', CLOSED: 'Fechado' } as const;

function CashHeader({ day, onRefresh }: { day: CashDay; onRefresh(): void }) {
  return (
    <div className="cash-header">
      <h1>
        Caixa de {day.closing.businessDate.split('-').reverse().join('/')}
      </h1>
      <span className="badge">{STATUS_LABEL[day.closing.status]}</span>
      <button
        type="button"
        className="button button-secondary"
        onClick={onRefresh}
      >
        Atualizar
      </button>
    </div>
  );
}

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
      <p className="page-message">Carregando…</p>
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
      <nav className="tabs" role="tablist">
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </nav>
      {tab === 'orders' && <OrdersTab {...props} />}
      {tab === 'expenses' && <ExpensesTab {...props} />}
      {tab === 'report' && <ReportTab {...props} />}
    </section>
  );
}
