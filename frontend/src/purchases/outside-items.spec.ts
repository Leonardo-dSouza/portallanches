import type { InvoiceItem } from '../api/invoice-types';
import {
  businessAmountOf,
  outsideMarksOf,
  savedOutsidePositions,
  toggledPositions,
} from './outside-items';

const item = (
  position: number,
  total: string,
  outsideBusiness?: boolean,
): InvoiceItem => ({
  position,
  code: String(position),
  description: `Item ${position}`,
  quantity: '1',
  unit: 'UN',
  unitPrice: total,
  total,
  outsideBusiness,
});

const ITEMS = [item(1, '24.83'), item(2, '4.89', true), item(3, '4.89')];

describe('itens fora da lanchonete', () => {
  it('soma as linhas marcadas em centavos', () => {
    expect(outsideMarksOf(ITEMS, [2, 3])).toEqual({
      positions: [2, 3],
      cents: 978,
    });
    expect(outsideMarksOf(ITEMS, []).cents).toBe(0);
  });

  it('lê as marcas da nota gravada (a da prévia vem sem)', () => {
    expect(savedOutsidePositions(ITEMS)).toEqual([2]);
    expect(savedOutsidePositions([item(1, '1.00')])).toEqual([]);
  });

  it('marca e desmarca mantendo a ordem da nota', () => {
    expect(toggledPositions([2, 9], [5])).toEqual([2, 5, 9]);
    expect(toggledPositions([2, 5, 9], [5])).toEqual([2, 9]);
    expect(toggledPositions([2], [5, 6])).toEqual([2, 5, 6]);
    expect(toggledPositions([2, 5, 6], [5, 6])).toEqual([2]);
  });

  it('a parte da lanchonete é o "a pagar" menos os itens de fora', () => {
    expect(businessAmountOf('447.26', 1467)).toBe('432.59');
    expect(businessAmountOf('5.00', 900)).toBe('0.00');
  });
});
