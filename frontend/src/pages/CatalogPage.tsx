import { useMemo, useState } from 'react';
import { useApi } from '../api/api-context';
import { createCashApi } from '../api/cash-api';
import { createCatalogAdminApi } from '../api/catalog-admin-api';
import { createProductApi } from '../api/product-api';
import { createSettingsApi } from '../api/settings-api';
import { createSupplyApi } from '../api/supply-api';
import { CategoriesTab } from '../catalog/CategoriesTab';
import { ExpenseTypesTab } from '../catalog/ExpenseTypesTab';
import { MotoboyRatesTab } from '../catalog/MotoboyRatesTab';
import { PaymentMethodsTab } from '../catalog/PaymentMethodsTab';
import { ProductsTab } from '../catalog/ProductsTab';
import { StockWarningSetting } from '../catalog/StockWarningSetting';
import { CashierSettingsTab } from '../catalog/CashierSettingsTab';
import { PasswordsTab } from '../catalog/PasswordsTab';
import { createPasswordApi } from '../api/password-api';
import { SubSections } from '../components/SubSections';
import { SuppliesTab } from '../catalog/SuppliesTab';
import { TicketTab } from '../catalog/TicketTab';
import { ZonesTab } from '../catalog/ZonesTab';
import { TabBar, type TabItem } from '../components/TabBar';
import { toDateKey } from '../history/date-keys';

type CatalogTabId =
  'products' | 'supplies' | 'deliveries' | 'payments' | 'ticket';

// O cardápio é o cadastro mais usado: abre primeiro (pedido do usuário, 2026-10-07). Desde
// 2026-10-11 os cadastros pequenos ficam juntos (eram 9 abas): Categorias no Cardápio,
// Bairros e Diária em Entregas, Pagamentos e Tipos de gasto juntos, e o aviso de saldo na
// Comanda. A aba Importação saiu em 2026-10-24 (hotfix): reimportar a planilha velha recriava
// as bebidas que o usuário apagou. `ImportsTab` e o backend da importação ficam para a sessão
// da planilha nova decidir se reaproveita ou apaga.
const TABS: TabItem<CatalogTabId>[] = [
  { id: 'products', label: 'Cardápio' },
  { id: 'supplies', label: 'Insumos' },
  { id: 'deliveries', label: 'Entregas' },
  { id: 'payments', label: 'Pagamentos e gastos' },
  { id: 'ticket', label: 'Comanda e ajustes' },
];

interface CatalogPageProps {
  /** Só para os testes fixarem "hoje" (`AAAA-MM-DD`); em uso normal é a data local. */
  today?: string;
}

function useCatalogApis() {
  const api = useApi();
  return useMemo(
    () => ({
      cash: createCashApi(api),
      admin: createCatalogAdminApi(api),
      supplies: createSupplyApi(api),
      products: createProductApi(api),
      settings: createSettingsApi(api),
      passwords: createPasswordApi(api),
    }),
    [api],
  );
}

/** Cadastros do admin: cada aba nova entra em `TABS` e no bloco abaixo. */
export function CatalogPage({ today }: CatalogPageProps) {
  const [todayKey] = useState(() => today ?? toDateKey(new Date()));
  const { cash, admin, supplies, products, settings, passwords } =
    useCatalogApis();
  const [tab, setTab] = useState<CatalogTabId>('products');
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
        {tab === 'products' && (
          <SubSections
            sections={[
              {
                id: 'items',
                label: 'Itens',
                render: () => (
                  <ProductsTab products={products} supplies={supplies} />
                ),
              },
              {
                id: 'categories',
                label: 'Categorias',
                render: () => <CategoriesTab products={products} />,
              },
            ]}
          />
        )}
        {tab === 'supplies' && <SuppliesTab supplies={supplies} />}
        {tab === 'deliveries' && (
          <SubSections
            sections={[
              {
                id: 'zones',
                label: 'Bairros',
                render: () => <ZonesTab cash={cash} admin={admin} />,
              },
              {
                id: 'rates',
                label: 'Diária do motoboy',
                render: () => (
                  <MotoboyRatesTab admin={admin} today={todayKey} />
                ),
              },
            ]}
          />
        )}
        {tab === 'payments' && (
          <SubSections
            sections={[
              {
                id: 'methods',
                label: 'Pagamentos',
                render: () => <PaymentMethodsTab cash={cash} admin={admin} />,
              },
              {
                id: 'expense-types',
                label: 'Tipos de gasto',
                render: () => <ExpenseTypesTab cash={cash} admin={admin} />,
              },
            ]}
          />
        )}
        {tab === 'ticket' && (
          <SubSections
            sections={[
              {
                id: 'ticket',
                label: 'Comanda',
                render: () => (
                  <>
                    <TicketTab settings={settings} products={products} />
                    <StockWarningSetting settings={settings} />
                  </>
                ),
              },
              {
                id: 'cashier',
                label: 'Caixa',
                render: () => <CashierSettingsTab settings={settings} />,
              },
              {
                id: 'passwords',
                label: 'Senhas',
                render: () => <PasswordsTab passwords={passwords} />,
              },
            ]}
          />
        )}
      </div>
    </section>
  );
}
