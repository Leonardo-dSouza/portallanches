import {
  columnIndex,
  parseCellAddress,
  parseRowRange,
} from './cell-address.js';

describe('endereços de célula', () => {
  it.each([
    ['A', 0],
    ['F', 5],
    ['AA', 26],
    ['AO', 40],
  ])('coluna %s = índice %i', (letters, index) => {
    expect(columnIndex(letters)).toBe(index);
  });

  it('lê endereço com ou sem $ e recusa lixo', () => {
    expect(parseCellAddress('F4')).toEqual({ row: 3, column: 5 });
    expect(parseCellAddress('$H$44')).toEqual({ row: 43, column: 7 });
    expect(parseCellAddress('F')).toBeNull();
    expect(parseCellAddress('4F')).toBeNull();
  });

  it('lê faixa de linhas inclusiva e recusa invertida ou zero', () => {
    expect(parseRowRange('2-4')).toEqual([2, 3, 4]);
    expect(parseRowRange('5-5')).toEqual([5]);
    expect(parseRowRange('4-2')).toBeNull();
    expect(parseRowRange('0-2')).toBeNull();
    expect(parseRowRange('2')).toBeNull();
  });
});
