import { useMemo, useState } from 'react';
import { useApi } from '../api/api-context';
import { createCashApi } from '../api/cash-api';
import { createCatalogAdminApi } from '../api/catalog-admin-api';
import { MotoboyRatesTab } from '../catalog/MotoboyRatesTab';
import { PaymentMethodsTab } from '../catalog/PaymentMethodsTab';
import { toDateKey } from '../history/date-keys';
import { ExpenseTypesTab } from '../catalog/ExpenseTypesTab';
import { ZonesTab } from '../catalog/ZonesTab';
import { TabBar, type TabItem } from '../components/TabBar';

type CatalogTabId = 'zones' | 'expenseTypes' | 'payments' | 'rates';

const TABS: TabItem<CatalogTabId>[] = [
  { id: 'zones', label: 'Bairros' },
  { id: 'expenseTypes', label: 'Tipos de gasto' },
  { id: 'payments', label: 'Pagamentos' },
  { id: 'rates', label: 'Diária do motoboy' },
];

interface CatalogPageProps {
  /** Só para os testes fixarem "hoje" (`AAAA-MM-DD`); em uso normal é a data local. */
  today?: string;
}

/** Cadastros do admin: cada aba nova entra em `TABS` e no bloco abaixo. */
export function CatalogPage({ today }: CatalogPageProps) {
  const [todayKey] = useState(() => today ?? toDateKey(new Date()));
  const api = useApi();
  const cash = useMemo(() => createCashApi(api), [api]);
  const admin = useMemo(() => createCatalogAdminApi(api), [api]);
  const [tab, setTab] = useState<CatalogTabId>('zones');
  return (
    <section>
      <header className="cash-header">
        <div>
          <p className="eyebrow">Administração</p>
          <h1>Cadastros</h1>
        </div>
      </header>
      <TabBar<CatalogTabId> tabs={TABS} active={tab} onSelect={setTab} />
      <div key={tab} className="tab-panel">
        {tab === 'zones' && <ZonesTab cash={cash} admin={admin} />}
        {tab === 'expenseTypes' && (
          <ExpenseTypesTab cash={cash} admin={admin} />
        )}
        {tab === 'payments' && <PaymentMethodsTab cash={cash} admin={admin} />}
        {tab === 'rates' && <MotoboyRatesTab admin={admin} today={todayKey} />}
      </div>
    </section>
  );
}
