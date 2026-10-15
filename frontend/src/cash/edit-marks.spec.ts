import { describe, expect, it } from 'vitest';
import { lineMark, removedLines } from './edit-marks';
import type { DraftLine } from './order-lines';

const line = (fields: Partial<DraftLine>): DraftLine => ({
  id: 1,
  savedId: 1,
  productId: 9,
  name: 'X Salada',
  menuNumber: 9,
  categoryName: 'Tradicional',
  unitPrice: '17.80',
  quantity: 2,
  note: '',
  addons: [],
  ...fields,
});

const SAVED = [
  line({}),
  line({ id: 2, savedId: 2, productId: 60, name: 'Coca', quantity: 1 }),
];

describe('lineMark', () => {
  it('fora da edição, nada é marcado', () => {
    expect(lineMark(line({ savedId: undefined }), [])).toBeNull();
  });

  it('nova, com outra quantidade, alterada ou igual', () => {
    expect(lineMark(line({ id: 3, savedId: undefined }), SAVED)).toEqual({
      kind: 'new',
    });
    expect(lineMark(line({ quantity: 3 }), SAVED)).toEqual({
      kind: 'quantity',
      delta: 1,
    });
    expect(lineMark(line({ note: 'sem tomate' }), SAVED)).toEqual({
      kind: 'changed',
    });
    const bacon = {
      productId: 33,
      name: 'bacon',
      unitPrice: '6.00',
      quantity: 1,
    };
    expect(lineMark(line({ addons: [bacon] }), SAVED)).toEqual({
      kind: 'changed',
    });
    expect(lineMark(line({}), SAVED)).toBeNull();
  });

  it('linha nova que reaproveitou o id de uma que saiu continua "nova"', () => {
    expect(lineMark(line({ id: 2, savedId: undefined }), SAVED)).toEqual({
      kind: 'new',
    });
  });
});

describe('removedLines', () => {
  it('as salvas que não estão mais na comanda', () => {
    expect(removedLines(SAVED, [line({})]).map((l) => l.name)).toEqual([
      'Coca',
    ]);
    expect(removedLines(SAVED, SAVED)).toEqual([]);
  });
});
