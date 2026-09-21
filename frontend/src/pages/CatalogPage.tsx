import { useMemo, useState } from 'react';
import { useApi } from '../api/api-context';
import { createCashApi } from '../api/cash-api';
import { createCatalogAdminApi } from '../api/catalog-admin-api';
import { ExpenseTypesTab } from '../catalog/ExpenseTypesTab';
import { ZonesTab } from '../catalog/ZonesTab';
import { TabBar, type TabItem } from '../components/TabBar';

type CatalogTabId = 'zones' | 'expenseTypes';

const TABS: TabItem<CatalogTabId>[] = [
  { id: 'zones', label: 'Bairros' },
  { id: 'expenseTypes', label: 'Tipos de gasto' },
];

/** Cadastros do admin. As próximas abas (pagamentos, diária, usuários) entram em `TABS`. */
export function CatalogPage() {
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
      </div>
    </section>
  );
}
