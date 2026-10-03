import { useMemo, useState } from 'react';
import { useApi } from '../api/api-context';
import { createStockApi } from '../api/stock-api';
import { createSupplyApi } from '../api/supply-api';
import { LoadFailure } from '../catalog/LoadFailure';
import { Skeleton } from '../components/Skeleton';
import { TabBar, type TabItem } from '../components/TabBar';
import { toDateKey } from '../history/date-keys';
import { CountTab } from '../stock/CountTab';
import { EntryTab } from '../stock/EntryTab';
import {
  createLocalSelectionStorage,
  type SelectionStorage,
} from '../stock/selection-storage';
import { ShoppingListTab } from '../stock/ShoppingListTab';
import { StatusTab } from '../stock/StatusTab';
import { isCritical } from '../stock/stock-view';
import { browserTextExport, type TextExport } from '../stock/text-export';
import { useStockData } from '../stock/use-stock-data';

type StockTabId = 'status' | 'entry' | 'count' | 'shopping';

interface StockPageProps {
  /** Só para os testes fixarem "hoje" (`AAAA-MM-DD`); em uso normal é a data local. */
  today?: string;
  /** Injetáveis nos testes; em uso normal, localStorage e área de transferência do navegador. */
  selectionStorage?: SelectionStorage;
  textExport?: TextExport;
}

/** Estoque (caixa e admin): situação com alertas, entrada de lotes e contagem. */
export function StockPage({
  today,
  selectionStorage,
  textExport = browserTextExport,
}: StockPageProps) {
  const [storage] = useState(
    () => selectionStorage ?? createLocalSelectionStorage(),
  );
  const [todayKey] = useState(() => today ?? toDateKey(new Date()));
  const api = useApi();
  const stock = useMemo(() => createStockApi(api), [api]);
  const supplies = useMemo(() => createSupplyApi(api), [api]);
  const { data, error, reload } = useStockData(stock, supplies);
  const [tab, setTab] = useState<StockTabId>('status');
  if (error) return <LoadFailure message={error} onRetry={reload} />;
  if (!data) return <Skeleton label="Carregando o estoque…" rows={5} />;
  const tabs: TabItem<StockTabId>[] = [
    {
      id: 'status',
      label: 'Situação',
      count: data.items.filter(isCritical).length,
    },
    { id: 'entry', label: 'Entrada' },
    { id: 'count', label: 'Contagem' },
    { id: 'shopping', label: 'Lista de compras' },
  ];
  return (
    <section>
      <header className="cash-header">
        <div>
          <p className="eyebrow">Insumos</p>
          <h1>Estoque</h1>
        </div>
      </header>
      <TabBar<StockTabId> tabs={tabs} active={tab} onSelect={setTab} />
      <div key={tab} className="tab-panel">
        {tab === 'status' && (
          <StatusTab
            items={data.items}
            sections={data.sections}
            today={todayKey}
          />
        )}
        {tab === 'entry' && (
          <EntryTab
            stock={stock}
            supplies={data.supplies}
            sections={data.sections}
            onSaved={reload}
          />
        )}
        {tab === 'count' && (
          <CountTab
            stock={stock}
            items={data.items}
            sections={data.sections}
            onSaved={reload}
          />
        )}
        {tab === 'shopping' && (
          <ShoppingListTab
            items={data.items}
            sections={data.sections}
            today={todayKey}
            storage={storage}
            textExport={textExport}
          />
        )}
      </div>
    </section>
  );
}
