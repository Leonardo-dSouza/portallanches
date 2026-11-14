import type { LucideIcon } from 'lucide-react';

export interface TabItem<Id extends string> {
  id: Id;
  label: string;
  /** Contagem opcional; fica `aria-hidden` para o nome acessível da aba ser só o rótulo. */
  count?: number;
  /** Ícone opcional antes do rótulo (as abas grandes de Compras). */
  icon?: LucideIcon;
}

/**
 * `main` = abas de cima; `sub` = sub-abas dentro de uma aba (ex.: Entregas → Bairros), menores;
 * `big` = teclas largas e fáceis de acertar (Compras, 2026-11-14).
 */
export type TabBarVariant = 'main' | 'sub' | 'big';

const VARIANT_CLASS: Record<TabBarVariant, string> = {
  main: 'tabs',
  sub: 'tabs tabs-sub',
  big: 'tabs tabs-big',
};

interface TabBarProps<Id extends string> {
  tabs: TabItem<Id>[];
  active: Id;
  onSelect(tab: Id): void;
  variant?: TabBarVariant;
}

/** Abas acessíveis (role tab) usadas no caixa e nos cadastros. */
export function TabBar<Id extends string>({
  tabs,
  active,
  onSelect,
  variant = 'main',
}: TabBarProps<Id>) {
  return (
    <nav className={VARIANT_CLASS[variant]} role="tablist">
      {tabs.map(({ id, label, count, icon: Icon }) => (
        <button
          key={id}
          type="button"
          role="tab"
          aria-selected={active === id}
          onClick={() => onSelect(id)}
        >
          {Icon && <Icon aria-hidden />}
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
