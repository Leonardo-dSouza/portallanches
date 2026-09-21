export interface TabItem<Id extends string> {
  id: Id;
  label: string;
  /** Contagem opcional; fica `aria-hidden` para o nome acessível da aba ser só o rótulo. */
  count?: number;
}

interface TabBarProps<Id extends string> {
  tabs: TabItem<Id>[];
  active: Id;
  onSelect(tab: Id): void;
}

/** Abas acessíveis (role tab) usadas no caixa e nos cadastros. */
export function TabBar<Id extends string>({
  tabs,
  active,
  onSelect,
}: TabBarProps<Id>) {
  return (
    <nav className="tabs" role="tablist">
      {tabs.map(({ id, label, count }) => (
        <button
          key={id}
          type="button"
          role="tab"
          aria-selected={active === id}
          onClick={() => onSelect(id)}
        >
          {label}
          {count !== undefined && (
            <span className="tab-count" aria-hidden="true">
              {count}
            </span>
          )}
        </button>
      ))}
    </nav>
  );
}
