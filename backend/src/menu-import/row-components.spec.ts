import { gridOf, MAPPING } from './menu-grid.fixture.js';
import type { MenuCorrections } from './menu-types.js';
import { effectiveCell, planRowComponents } from './row-components.js';

const plan = (
  cells: Parameters<typeof gridOf>[0],
  corrections: MenuCorrections = {},
) =>
  planRowComponents({
    sheet: 'Lanches',
    grid: gridOf(cells),
    row: 1,
    corrections,
    portions: MAPPING.portions,
  });

describe('effectiveCell', () => {
  const cell = { value: 3, formula: null };
  it('troca fórmula, ignora com skip e substitui valor', () => {
    expect(effectiveCell(cell, 'L!H2', { 'L!H2': '=itens_custos!F8' })).toEqual(
      { value: null, formula: 'itens_custos!F8' },
    );
    expect(effectiveCell(cell, 'L!H2', { 'L!H2': 'skip' })).toEqual({
      value: null,
      formula: null,
    });
    expect(effectiveCell(cell, 'L!B2', { 'L!B2': 'X Salada' })).toEqual({
      value: 'X Salada',
      formula: null,
    });
    expect(effectiveCell(cell, 'L!H2', {})).toBe(cell);
  });
});

describe('planRowComponents', () => {
  it('soma insumos repetidos, aplica o fator e abre os kits', () => {
    const result = plan({
      C2: 'pão',
      D2: ['=itens_custos!F6*2', 2.88],
      F2: ['=itens_custos!F8', 1],
      AF2: ['=itens_custos!H44', 0.9],
    });
    expect(result).toEqual({
      components: [
        { supplyKey: 'queijo bandeja', quantity: '0.082' },
        { supplyKey: 'hamburguer 56g', quantity: '1' },
        { supplyKey: 'hamburgueira', quantity: '1' },
      ],
      issues: [],
      corrected: false,
    });
  });

  it('valor digitado, texto, fórmula estranha e célula sem mapeamento viram erro', () => {
    const { issues } = plan({
      D2: 3,
      F2: 'xx',
      H2: ['=SUM(A1:A3)', 1],
      J2: ['=itens_custos!F99', 1],
    });
    expect(issues.map((i) => [i.where, i.severity])).toEqual([
      ['Lanches!D2', 'error'],
      ['Lanches!F2', 'error'],
      ['Lanches!H2', 'error'],
      ['Lanches!J2', 'error'],
    ]);
    expect(issues[3].message).toMatch(
      /itens_custos!F99 não está em "portions"/,
    );
  });

  it('usa as correções e marca a linha como corrigida', () => {
    const result = plan(
      { D2: 3, F2: 'xx' },
      { 'Lanches!D2': '=itens_custos!F8', 'Lanches!F2': 'skip' },
    );
    expect(result).toMatchObject({
      components: [{ supplyKey: 'hamburguer 56g', quantity: '1' }],
      issues: [],
      corrected: true,
    });
  });

  it('quantidade que passaria de 3 casas vira erro', () => {
    const { issues } = plan({ D2: ['=itens_custos!F6*0.3', 0.432] });
    expect(issues[0].message).toMatch(
      /0.036 × 0.3 de "Queijo bandeja" passa de 3 casas/,
    );
  });
});
