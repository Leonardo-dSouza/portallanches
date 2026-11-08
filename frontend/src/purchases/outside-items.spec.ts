import type { InvoiceItem } from '../api/invoice-types';
import {
  businessAmountOf,
  calculateInvoiceSplit,
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

describe('calculateInvoiceSplit (exemplo real, 2026-11-08)', () => {
  const REAL = {
    amountDueCents: 4314,
    outsideGrossCents: 2856,
    discountCents: 719,
  };

  it('ponta 1: desconto da lanchonete zero joga todo o desconto para o item de fora', () => {
    expect(
      calculateInvoiceSplit({ ...REAL, businessDiscountCents: 0 }),
    ).toEqual({
      outsideNetCents: 2137,
      businessCents: 2177,
    });
  });

  it('ponta 2: desconto da lanchonete inteiro mantém o comportamento de hoje', () => {
    expect(
      calculateInvoiceSplit({ ...REAL, businessDiscountCents: 719 }),
    ).toEqual({
      outsideNetCents: 2856,
      businessCents: 1458,
    });
  });

  it('valor no meio: desconto da lanchonete de R$ 3,00 divide o desconto', () => {
    expect(
      calculateInvoiceSplit({ ...REAL, businessDiscountCents: 300 }),
    ).toEqual({
      outsideNetCents: 2437,
      businessCents: 1877,
    });
  });
});

describe('itens fora da lanchonete', () => {
  it('soma as linhas marcadas em centavos e divide o desconto', () => {
    expect(outsideMarksOf({ items: ITEMS, positions: [2, 3] })).toEqual({
      positions: [2, 3],
      cents: 978,
      grossCents: 978,
      businessDiscount: '0.00',
    });
    expect(outsideMarksOf({ items: ITEMS, positions: [] }).cents).toBe(0);
  });

  it('no exemplo real com desconto 7.19 e desconto da lanchonete 0.00 calcula fora líquido', () => {
    const realItems = [item(1, '28.56'), item(2, '21.77')];
    const marks = outsideMarksOf({
      items: realItems,
      positions: [1],
      discount: '7.19',
      businessDiscount: '0.00',
      amountDue: '43.14',
    });
    expect(marks).toEqual({
      positions: [1],
      cents: 2137,
      grossCents: 2856,
      businessDiscount: '0.00',
    });
    expect(businessAmountOf('43.14', marks.cents)).toBe('21.77');
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
