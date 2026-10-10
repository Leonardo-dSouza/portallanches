import type { SavedOrder } from '../api/types';
import { orderFixture } from '../test-support/order-fixture';
import { storedItem, storedLine } from '../test-support/order-menu';
import { receiptAfterSave } from './print-decision';

const DAY = { paymentMethods: [], zones: [] };
const SALADA = storedItem(storedLine('X Salada', 'Tradicional', 1, '17.80'));
const COCA = {
  ...storedItem(storedLine('Coca', 'Refrigerantes', 1, '7.00')),
  productId: 5,
};

const saved = (fields: Partial<SavedOrder> = {}): SavedOrder => ({
  ...orderFixture({ items: [SALADA] }),
  stockShortfalls: [],
  live: true,
  ...fields,
});

describe('receiptAfterSave', () => {
  it('pedido novo na noite em andamento: a comanda inteira', () => {
    expect(receiptAfterSave(saved(), null, DAY)?.kind).toBe('full');
  });

  it('caixa atrasado nunca imprime sozinho', () => {
    expect(receiptAfterSave(saved({ live: false }), null, DAY)).toBeNull();
  });

  it('edição que acrescenta itens: a ADIÇÃO só com eles', () => {
    const editing = orderFixture({ items: [SALADA] });
    const receipt = receiptAfterSave(
      saved({ items: [SALADA, COCA] }),
      editing,
      DAY,
    );
    expect(receipt?.kind).toBe('addition');
    expect(receipt?.rows.map((row) => row.name)).toEqual(['Coca']);
  });

  it('edição sem item novo (ex.: receber a conta aberta) não imprime', () => {
    const editing = orderFixture({ items: [SALADA], paymentMethodId: null });
    expect(receiptAfterSave(saved(), editing, DAY)).toBeNull();
  });
});
