import { Coins, EyeOff, Plus, Salad, Search } from 'lucide-react';
import type { ProductCategory } from '../api/types';
import { SwitchRow, type SwitchOption } from '../components/SwitchRow';
import type { MenuFilter } from './product-menu';

interface ProductToolbarProps {
  categories: ProductCategory[];
  filter: MenuFilter;
  /** Lanches por categoria com a busca atual (para o número em cada botão). */
  counts: Map<number, number>;
  onChange(filter: MenuFilter): void;
  onNew(): void;
}

function CategoryChips(props: ProductToolbarProps) {
  const { categories, filter, counts, onChange } = props;
  const total = [...counts.values()].reduce((sum, n) => sum + n, 0);
  const options = [
    { id: null, name: 'Todos', count: total },
    ...categories.map((c) => ({
      id: c.id,
      name: c.name,
      count: counts.get(c.id) ?? 0,
    })),
  ];
  return (
    <div className="menu-chips" role="group" aria-label="Filtrar por categoria">
      {options.map((option) => (
        <button
          key={option.name}
          type="button"
          aria-pressed={filter.categoryId === option.id}
          onClick={() => onChange({ ...filter, categoryId: option.id })}
        >
          {option.name} <span className="menu-chip-count">{option.count}</span>
        </button>
      ))}
    </div>
  );
}

type OptionKey = 'showIngredients' | 'showCosts' | 'showInactive';

const VIEW_OPTIONS: readonly SwitchOption<OptionKey>[] = [
  { key: 'showIngredients', label: 'Ingredientes', Icon: Salad },
  { key: 'showCosts', label: 'Custos', Icon: Coins },
  { key: 'showInactive', label: 'Inativos', Icon: EyeOff },
];

/**
 * Liga/desliga o que o quadro mostra: interruptores (vários ao mesmo tempo), diferentes
 * das categorias, que escolhem uma só.
 */
function ViewOptions(props: Pick<ProductToolbarProps, 'filter' | 'onChange'>) {
  const { filter, onChange } = props;
  return (
    <SwitchRow
      label="Mostrar"
      options={VIEW_OPTIONS}
      isOn={(key) => filter[key]}
      onToggle={(key) => onChange({ ...filter, [key]: !filter[key] })}
    />
  );
}

/** Busca, filtro por categoria, inativos e "Novo item": tudo numa faixa fixa acima do quadro. */
export function ProductToolbar(props: ProductToolbarProps) {
  const { filter, onChange, onNew } = props;
  return (
    <div className="menu-toolbar">
      <label className="menu-search">
        <Search aria-hidden />
        <input
          type="search"
          aria-label="Buscar no cardápio"
          placeholder="Nome, nº ou ingrediente"
          value={filter.query}
          onChange={(event) =>
            onChange({ ...filter, query: event.target.value })
          }
        />
      </label>
      <CategoryChips {...props} />
      <div className="menu-toolbar-row">
        <ViewOptions filter={filter} onChange={onChange} />
        <button type="button" className="button menu-new" onClick={onNew}>
          <Plus aria-hidden />
          Novo item
        </button>
      </div>
    </div>
  );
}
