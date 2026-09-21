import { columnLetter } from './sheet-grid.js';

describe('columnLetter', () => {
  it.each([
    [0, 'A'],
    [25, 'Z'],
    [26, 'AA'],
    [27, 'AB'],
  ])('coluna %i é %s', (index, letter) => {
    expect(columnLetter(index)).toBe(letter);
  });
});
