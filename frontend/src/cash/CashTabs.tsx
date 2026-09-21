import { TabBar } from '../components/TabBar';

export type TabId = 'orders' | 'expenses' | 'report';

interface CashTabsProps {
  active: TabId;
  counts: Partial<Record<TabId, number>>;
  onSelect(tab: TabId): void;
}

const LABELS: Record<TabId, string> = {
  orders: 'Pedidos',
  expenses: 'Gastos',
  report: 'Relatório',
};

export function CashTabs({ active, counts, onSelect }: CashTabsProps) {
  const tabs = (Object.keys(LABELS) as TabId[]).map((id) => ({
    id,
    label: LABELS[id],
    count: counts[id],
  }));
  return <TabBar tabs={tabs} active={active} onSelect={onSelect} />;
}
