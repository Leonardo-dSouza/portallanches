export type TabId = 'orders' | 'expenses' | 'report';

interface CashTabsProps {
  active: TabId;
  counts: Partial<Record<TabId, number>>;
  onSelect(tab: TabId): void;
}

const TABS: { id: TabId; label: string }[] = [
  { id: 'orders', label: 'Pedidos' },
  { id: 'expenses', label: 'Gastos' },
  { id: 'report', label: 'Relatório' },
];

/** Contagem fica `aria-hidden` para o nome acessível da aba continuar sendo só o rótulo. */
export function CashTabs({ active, counts, onSelect }: CashTabsProps) {
  return (
    <nav className="tabs" role="tablist">
      {TABS.map(({ id, label }) => (
        <button
          key={id}
          type="button"
          role="tab"
          aria-selected={active === id}
          onClick={() => onSelect(id)}
        >
          {label}
          {counts[id] !== undefined && (
            <span className="tab-count" aria-hidden="true">
              {counts[id]}
            </span>
          )}
        </button>
      ))}
    </nav>
  );
}
