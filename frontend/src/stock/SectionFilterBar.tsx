import { Search } from 'lucide-react';
import type { SupplySection } from '../api/types';
import { NO_SECTION_ID, type SectionFilter } from './supply-sections';

interface SectionFilterBarProps {
  sections: SupplySection[];
  filter: SectionFilter;
  /** Itens por seção com a busca atual (`countBySection`). */
  counts: Map<number, number>;
  onChange(filter: SectionFilter): void;
}

function chipOptions(props: SectionFilterBarProps) {
  const { sections, counts } = props;
  const total = [...counts.values()].reduce((sum, n) => sum + n, 0);
  const options = [
    { id: null, name: 'Todas', count: total },
    ...sections.map((s) => ({
      id: s.id,
      name: s.name,
      count: counts.get(s.id) ?? 0,
    })),
  ];
  const withoutSection = counts.get(NO_SECTION_ID) ?? 0;
  if (withoutSection === 0) return options;
  return [
    ...options,
    { id: NO_SECTION_ID, name: 'Sem seção', count: withoutSection },
  ];
}

/**
 * Busca e seções do estoque numa faixa só, nos mesmos moldes da faixa do Cardápio.
 *
 * @example <SectionFilterBar sections={sections} filter={filter} counts={counts} onChange={setFilter} />
 */
export function SectionFilterBar(props: SectionFilterBarProps) {
  const { filter, onChange } = props;
  return (
    <div className="menu-toolbar">
      <label className="menu-search">
        <Search aria-hidden />
        <input
          type="search"
          aria-label="Buscar insumo"
          placeholder="Buscar insumo"
          value={filter.query}
          onChange={(event) =>
            onChange({ ...filter, query: event.target.value })
          }
        />
      </label>
      <div className="menu-chips" role="group" aria-label="Filtrar por seção">
        {chipOptions(props).map((option) => (
          <button
            key={option.name}
            type="button"
            aria-pressed={filter.sectionId === option.id}
            onClick={() => onChange({ ...filter, sectionId: option.id })}
          >
            {option.name}{' '}
            <span className="menu-chip-count">{option.count}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
