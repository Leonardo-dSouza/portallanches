import { Search } from 'lucide-react';
import type { ReactNode } from 'react';
import type { SupplySection } from '../api/types';
import { sectionChips, type SectionFilter } from './supply-sections';

interface SectionFilterBarProps {
  sections: SupplySection[];
  filter: SectionFilter;
  /** Itens por seção com a busca atual (`countBySection`). */
  counts: Map<number, number>;
  onChange(filter: SectionFilter): void;
  /** Controle extra entre a busca e as seções (ex.: "Contagem do dia"). */
  extra?: ReactNode;
}

/**
 * Busca (e o controle extra) em cima; as seções numa linha inteira embaixo, que rola de
 * lado se não couber. Mesmo desenho da faixa do Cardápio.
 *
 * @example <SectionFilterBar sections={sections} filter={filter} counts={counts} onChange={setFilter} />
 */
export function SectionFilterBar(props: SectionFilterBarProps) {
  const { filter, onChange } = props;
  const chips = sectionChips(props.sections, props.counts, filter.sectionId);
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
      {props.extra}
      <div
        className="menu-chips section-chips"
        role="group"
        aria-label="Filtrar por seção"
      >
        {chips.map((option) => (
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
