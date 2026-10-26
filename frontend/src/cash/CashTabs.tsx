import { TabBar } from '../components/TabBar';

export type TabId = 'orders' | 'expenses' | 'staff' | 'fiado' | 'report';

interface CashTabsProps {
  active: TabId;
  counts: Partial<Record<TabId, number>>;
  onSelect(tab: TabId): void;
}

const LABELS: Record<TabId, string> = {
  orders: 'Pedidos',
  expenses: 'Gastos',
  // Consumo interno da equipe (2026-10-23): antes do Relatório, que fecha o dia.
  staff: 'Consumo',
  // Quem deve e o extrato (2026-10-25); a contagem é de clientes devendo.
  fiado: 'Fiado',
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
