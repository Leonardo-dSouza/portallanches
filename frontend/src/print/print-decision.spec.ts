import type { SavedOrder } from '../api/types';
import { orderFixture } from '../test-support/order-fixture';
import { storedItem, storedLine } from '../test-support/order-menu';
import { receiptAfterSave } from './print-decision';
import { DEFAULT_TICKET_SETTINGS } from './ticket-settings';

const DAY = {
  paymentMethods: [],
  zones: [],
  ticket: DEFAULT_TICKET_SETTINGS,
};
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

  it('edição que acrescenta itens: a comanda inteira com ALTERADO (2026-10-15)', () => {
    const editing = orderFixture({ items: [SALADA] });
    const receipt = receiptAfterSave(
      saved({ items: [SALADA, COCA] }),
      editing,
      DAY,
    );
    expect(receipt?.kind).toBe('changed');
    expect(receipt?.items.map((item) => item.newMark)).toEqual([
      undefined,
      'NOVO',
    ]);
  });

  it('edição que só tira um item também imprime (a chapa precisa saber)', () => {
    const editing = orderFixture({ items: [SALADA, COCA] });
    const receipt = receiptAfterSave(saved({ items: [SALADA] }), editing, DAY);
    expect(receipt?.kind).toBe('changed');
    expect(receipt?.removed).toHaveLength(1);
  });

  it('edição sem item novo (ex.: receber a conta aberta) não imprime', () => {
    const editing = orderFixture({ items: [SALADA], paymentMethodId: null });
    expect(receiptAfterSave(saved(), editing, DAY)).toBeNull();
  });
});
