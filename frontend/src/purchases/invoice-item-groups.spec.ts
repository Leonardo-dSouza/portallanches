import type { InvoiceItem } from '../api/invoice-types';
import type { ProductPurchase } from '../api/purchase-types';
import {
  groupInvoiceItems,
  groupProductPurchases,
} from './invoice-item-groups';

const item = (position: number, fields: Partial<InvoiceItem> = {}) => ({
  position,
  code: '69546',
  description: 'L COND 395G',
  quantity: '1',
  unit: 'Un',
  unitPrice: '5.99',
  total: '5.99',
  ...fields,
});

describe('groupInvoiceItems', () => {
  it('junta as linhas repetidas: 8 latas viram 8 Un com o total somado', () => {
    const items = Array.from({ length: 8 }, (_, i) => item(i + 1));
    expect(groupInvoiceItems(items, new Set())).toEqual([
      {
        key: '1',
        positions: [1, 2, 3, 4, 5, 6, 7, 8],
        code: '69546',
        description: 'L COND 395G',
        quantity: '8',
        unit: 'Un',
        unitPrice: '5.99',
        total: '47.92',
      },
    ]);
  });

  it('soma o peso sem float: bacon em 3 linhas', () => {
    const bacon = { code: '1128810', unit: 'Kg', unitPrice: '19.9' };
    const [group] = groupInvoiceItems(
      [
        item(1, { ...bacon, quantity: '1.248', total: '24.84' }),
        item(2, { ...bacon, quantity: '1.128', total: '22.45' }),
        item(3, { ...bacon, quantity: '1.352', total: '26.90' }),
      ],
      new Set(),
    );
    expect(group.quantity).toBe('3.728');
    expect(group.total).toBe('74.19');
  });

  it('mantém a ordem da nota, pela primeira linha de cada produto', () => {
    const items = [item(1), item(2, { code: '1' }), item(3)];
    const groups = groupInvoiceItems(items, new Set());
    expect(groups.map((g) => g.positions)).toEqual([[1, 3], [2]]);
  });

  it('o mesmo código com outro preço fica em outra linha', () => {
    const groups = groupInvoiceItems(
      [item(1), item(2, { unitPrice: '4.99', total: '4.99' })],
      new Set(),
    );
    expect(groups).toHaveLength(2);
  });

  it('marca de fora só em parte das linhas fica em linha própria', () => {
    const groups = groupInvoiceItems([item(1), item(2), item(3)], new Set([3]));
    expect(groups.map((g) => g.positions)).toEqual([[1, 2], [3]]);
  });
});

describe('groupProductPurchases', () => {
  const purchase = (
    invoiceId: number,
    fields: Partial<ProductPurchase> = {},
  ): ProductPurchase => ({
    invoiceId,
    invoiceNumber: invoiceId * 10,
    issuedAt: '2026-10-18T20:14:11.000Z',
    description: 'L COND 395G',
    quantity: '1',
    unit: 'Un',
    unitPrice: '5.99',
    total: '5.99',
    ...fields,
  });

  it('junta as linhas da mesma nota e deixa as notas separadas', () => {
    const groups = groupProductPurchases([
      purchase(9),
      purchase(9),
      purchase(4),
    ]);
    expect(groups.map((g) => [g.invoiceId, g.quantity, g.total])).toEqual([
      [9, '2', '11.98'],
      [4, '1', '5.99'],
    ]);
  });
});
