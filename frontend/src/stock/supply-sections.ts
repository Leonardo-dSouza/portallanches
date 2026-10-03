import type { SupplySection } from '../api/types';

/** O mínimo que insumo, item do estoque e linha de entrada têm em comum para filtrar. */
export interface Sectioned {
  name: string;
  sectionId: number | null;
}

/** Id do botão "Sem seção" (ids do banco começam em 1). */
export const NO_SECTION_ID = 0;

export interface SectionFilter {
  query: string;
  /** null = todas; NO_SECTION_ID = só os sem seção. */
  sectionId: number | null;
}

export const EMPTY_SECTION_FILTER: SectionFilter = {
  query: '',
  sectionId: null,
};

export interface SectionGroup<T> {
  /** null = grupo "Sem seção", sempre por último. */
  section: SupplySection | null;
  items: T[];
}

const searchKey = (text: string): string =>
  text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();

/** Seção efetiva: id que não está na lista (seção apagada ou não carregada) conta como sem. */
function sectionIdOf(item: Sectioned, sections: SupplySection[]): number {
  const known = sections.some((s) => s.id === item.sectionId);
  return known && item.sectionId !== null ? item.sectionId : NO_SECTION_ID;
}

/**
 * Itens visíveis com a busca (trecho do nome, sem acento) e a seção escolhida.
 *
 * @example filterBySection(items, { query: 'coca', sectionId: 3 }, sections)
 */
export function filterBySection<T extends Sectioned>(
  items: T[],
  filter: SectionFilter,
  sections: SupplySection[],
): T[] {
  const key = searchKey(filter.query);
  return items.filter(
    (item) =>
      (filter.sectionId === null ||
        sectionIdOf(item, sections) === filter.sectionId) &&
      searchKey(item.name).includes(key),
  );
}

export interface SectionChip {
  /** null = "Todas"; NO_SECTION_ID = "Sem seção". */
  id: number | null;
  name: string;
  count: number;
}

/**
 * Botões do filtro de seção. Seção sem item com o filtro atual some (na Contagem do dia
 * sobram 1 ou 2), menos a escolhida, para o botão não sumir debaixo do dedo.
 *
 * @example sectionChips(sections, countBySection(items, '', sections), null)[0].name // 'Todas'
 */
export function sectionChips(
  sections: SupplySection[],
  counts: Map<number, number>,
  selectedId: number | null,
): SectionChip[] {
  const total = [...counts.values()].reduce((sum, n) => sum + n, 0);
  const chips = [
    ...sections.map((s) => ({
      id: s.id,
      name: s.name,
      count: counts.get(s.id) ?? 0,
    })),
    {
      id: NO_SECTION_ID,
      name: 'Sem seção',
      count: counts.get(NO_SECTION_ID) ?? 0,
    },
  ];
  const shown = chips.filter((c) => c.count > 0 || c.id === selectedId);
  return [{ id: null, name: 'Todas', count: total }, ...shown];
}

/**
 * "Contagem do dia": ligado deixa só os insumos marcados para contar todo dia.
 *
 * @example onlyDaily(items, true).every((i) => i.dailyCount) // true
 */
export function onlyDaily<T extends { dailyCount: boolean }>(
  items: T[],
  on: boolean,
): T[] {
  return on ? items.filter((item) => item.dailyCount) : items;
}

/**
 * Agrupa na ordem das seções (a ordem da prateleira), com "Sem seção" no fim; grupos
 * vazios somem e a ordem dos itens dentro do grupo é mantida.
 *
 * @example groupBySection(items, sections)[0].section?.name // 'Geladeira'
 */
export function groupBySection<T extends Sectioned>(
  items: T[],
  sections: SupplySection[],
): SectionGroup<T>[] {
  const groups: SectionGroup<T>[] = [
    ...sections.map((section) => ({
      section,
      items: items.filter((i) => sectionIdOf(i, sections) === section.id),
    })),
    {
      section: null,
      items: items.filter((i) => sectionIdOf(i, sections) === NO_SECTION_ID),
    },
  ];
  return groups.filter((group) => group.items.length > 0);
}

/**
 * Quantos itens cada seção teria com a busca atual (número nos botões de filtro).
 *
 * @example countBySection(items, 'coca', sections).get(3) // 4
 */
export function countBySection<T extends Sectioned>(
  items: T[],
  query: string,
  sections: SupplySection[],
): Map<number, number> {
  const counts = new Map<number, number>();
  const visible = filterBySection(items, { query, sectionId: null }, sections);
  for (const item of visible) {
    const id = sectionIdOf(item, sections);
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  return counts;
}
