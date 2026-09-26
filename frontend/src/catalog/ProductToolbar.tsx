import { Plus, Search } from 'lucide-react';
import type { ProductCategory } from '../api/types';
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

type OptionKey = 'showIngredients' | 'showInactive';

const VIEW_OPTIONS: { key: OptionKey; label: string }[] = [
  { key: 'showIngredients', label: 'ingredientes' },
  { key: 'showInactive', label: 'inativos' },
];

function ViewOptions(props: Pick<ProductToolbarProps, 'filter' | 'onChange'>) {
  const { filter, onChange } = props;
  return (
    <fieldset className="menu-view-options">
      <legend>Mostrar</legend>
      {VIEW_OPTIONS.map(({ key, label }) => (
        <label key={key} className="catalog-toggle">
          <input
            type="checkbox"
            checked={filter[key]}
            onChange={(event) =>
              onChange({ ...filter, [key]: event.target.checked })
            }
          />
          {label}
        </label>
      ))}
    </fieldset>
  );
}

/** Busca, filtro por categoria, inativos e "Novo lanche": tudo numa faixa fixa acima do quadro. */
export function ProductToolbar(props: ProductToolbarProps) {
  const { filter, onChange, onNew } = props;
  return (
    <div className="menu-toolbar">
      <label className="menu-search">
        <Search aria-hidden />
        <input
          type="search"
          aria-label="Buscar lanche"
          placeholder="Nome, nº ou ingrediente"
          value={filter.query}
          onChange={(event) =>
            onChange({ ...filter, query: event.target.value })
          }
        />
      </label>
      <CategoryChips {...props} />
      <ViewOptions filter={filter} onChange={onChange} />
      <button type="button" className="button menu-new" onClick={onNew}>
        <Plus aria-hidden />
        Novo lanche
      </button>
    </div>
  );
}
