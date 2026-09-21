import { readAmountCells } from './amount-cells.js';
import type { ImportIssue } from './import-types.js';

function read(cells: (string | number | null)[], corrections = {}) {
  const issues: ImportIssue[] = [];
  const values = readAmountCells(cells, 'Janeiro!B', corrections, issues);
  return { values, issues };
}

describe('readAmountCells', () => {
  it('formata com 2 casas e mantém a posição de células vazias', () => {
    expect(read([36.4, null, 20]).values).toEqual(['36.40', null, '20.00']);
  });

  it('trata "-" e zero como vazio, com aviso apontando a célula', () => {
    const { values, issues } = read(['-', 0]);
    expect(values).toEqual([null, null]);
    expect(issues.map((i) => [i.severity, i.where])).toEqual([
      ['warning', 'Janeiro!B2'],
      ['warning', 'Janeiro!B3'],
    ]);
  });

  it.each([['abc'], [-30], [127.203]])('rejeita %s como erro', (cell) => {
    const { issues } = read([cell]);
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({ severity: 'error', where: 'Janeiro!B2' });
  });

  it('aceita correção de célula com valor ou skip', () => {
    const fixed = read([127.203, 'abc'], {
      'Janeiro!B2': 127.2,
      'Janeiro!B3': 'skip',
    });
    expect(fixed.values).toEqual(['127.20', null]);
    expect(fixed.issues).toEqual([]);
  });
});
