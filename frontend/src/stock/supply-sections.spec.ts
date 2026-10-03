import type { SupplySection } from '../api/types';
import {
  countBySection,
  filterBySection,
  groupBySection,
  NO_SECTION_ID,
  onlyDaily,
  sectionChips,
} from './supply-sections';

const section = (id: number, name: string): SupplySection => ({
  id,
  name,
  sortOrder: id,
  active: true,
});

const SECTIONS = [section(1, 'Geladeira'), section(3, 'Refrigerantes')];

const ITEMS = [
  { name: 'Coca Cola 2l', sectionId: 3 },
  { name: 'Pão hambúrguer', sectionId: null },
  { name: 'Hambúrguer 56g', sectionId: 1 },
  { name: 'Detergente', sectionId: 99 },
];

describe('filterBySection', () => {
  it('busca sem acento e sem maiúsculas', () => {
    const found = filterBySection(
      ITEMS,
      { query: 'HAMBURGUER', sectionId: null },
      SECTIONS,
    );
    expect(found.map((i) => i.name)).toEqual([
      'Pão hambúrguer',
      'Hambúrguer 56g',
    ]);
  });

  it('filtra pela seção escolhida', () => {
    const found = filterBySection(ITEMS, { query: '', sectionId: 3 }, SECTIONS);
    expect(found.map((i) => i.name)).toEqual(['Coca Cola 2l']);
  });

  it('"Sem seção" inclui seção desconhecida', () => {
    const found = filterBySection(
      ITEMS,
      { query: '', sectionId: NO_SECTION_ID },
      SECTIONS,
    );
    expect(found.map((i) => i.name)).toEqual(['Pão hambúrguer', 'Detergente']);
  });
});

describe('groupBySection', () => {
  it('segue a ordem das seções e deixa "Sem seção" por último', () => {
    const groups = groupBySection(ITEMS, SECTIONS);
    expect(groups.map((g) => g.section?.name ?? 'Sem seção')).toEqual([
      'Geladeira',
      'Refrigerantes',
      'Sem seção',
    ]);
  });

  it('some com grupo vazio', () => {
    const groups = groupBySection([ITEMS[0]], SECTIONS);
    expect(groups).toHaveLength(1);
  });
});

describe('countBySection', () => {
  it('conta por seção com a busca atual', () => {
    const counts = countBySection(ITEMS, 'a', SECTIONS);
    expect(Object.fromEntries(counts)).toEqual({
      [NO_SECTION_ID]: 1,
      1: 1,
      3: 1,
    });
  });
});

describe('onlyDaily', () => {
  const items = [
    { name: 'Tomate', dailyCount: true },
    { name: 'Ketchup', dailyCount: false },
  ];

  it('ligado deixa só os de "contar todo dia"; desligado deixa todos', () => {
    expect(onlyDaily(items, true).map((i) => i.name)).toEqual(['Tomate']);
    expect(onlyDaily(items, false)).toBe(items);
  });
});

describe('sectionChips', () => {
  const counts = new Map([
    [1, 2],
    [NO_SECTION_ID, 1],
  ]);

  it('"Todas" com o total, seções com itens e "Sem seção" no fim', () => {
    expect(sectionChips(SECTIONS, counts, null)).toEqual([
      { id: null, name: 'Todas', count: 3 },
      { id: 1, name: 'Geladeira', count: 2 },
      { id: NO_SECTION_ID, name: 'Sem seção', count: 1 },
    ]);
  });

  it('seção vazia some, a não ser a escolhida (o botão não pode sumir debaixo do dedo)', () => {
    expect(sectionChips(SECTIONS, counts, 3).map((c) => c.name)).toEqual([
      'Todas',
      'Geladeira',
      'Refrigerantes',
      'Sem seção',
    ]);
  });
});
