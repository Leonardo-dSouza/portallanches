import { useState } from 'react';
import type { SupplySection } from '../api/types';
import {
  countBySection,
  EMPTY_SECTION_FILTER,
  filterBySection,
  groupBySection,
  type Sectioned,
  type SectionFilter,
  type SectionGroup,
} from './supply-sections';

export interface SectionFilterState<T> {
  filter: SectionFilter;
  setFilter(filter: SectionFilter): void;
  counts: Map<number, number>;
  visible: T[];
  groups: SectionGroup<T>[];
}

/**
 * Estado do filtro de seção e busca de uma aba, com os itens já filtrados e agrupados.
 *
 * @example const view = useSectionFilter(items, sections); view.groups.length
 */
export function useSectionFilter<T extends Sectioned>(
  items: T[],
  sections: SupplySection[],
): SectionFilterState<T> {
  const [filter, setFilter] = useState(EMPTY_SECTION_FILTER);
  const visible = filterBySection(items, filter, sections);
  return {
    filter,
    setFilter,
    counts: countBySection(items, filter.query, sections),
    visible,
    groups: groupBySection(visible, sections),
  };
}
