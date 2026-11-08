import { FakeOrderCatalog } from './order-fakes.fixture.js';
import { assertRequiredChoices } from './order-choices.js';
import type { OrderItemInput } from './order-item-input.js';
import type { OrderEntry, OrderLine } from './order-pricing.js';

const products = new Map(new FakeOrderCatalog().products.map((p) => [p.id, p]));

const item = (
  productId: number,
  choiceProductId: number | null,
  quantity = 1,
): OrderItemInput => ({
  productId,
  quantity,
  note: null,
  choiceProductId,
  addons: [],
  removedSupplyIds: [],
});

const line = (productId: number, quantity = 1): OrderLine => ({
  productId,
  productName: `Produto ${productId}`,
  menuNumber: null,
  categoryName: 'Artesanal',
  quantity,
  unitPrice: '0.00',
  unitCmv: null,
  cmvComplete: false,
  removals: [],
});

const saved = (choice: OrderLine | null, quantity = 1): OrderEntry => ({
  ...line(29, quantity),
  note: null,
  choice,
  addons: [],
});

const check =
  (items: OrderItemInput[], previous: OrderEntry[] = []) =>
  () =>
    assertRequiredChoices(items, products, previous);

describe('assertRequiredChoices', () => {
  it('artesanal com um pão da categoria passa; item sem escolha sem pão passa', () => {
    expect(check([item(29, 67), item(9, null)])).not.toThrow();
  });

  it('artesanal sem pão → 422 com o lanche e a categoria', () => {
    expect(check([item(29, null)])).toThrow(
      '"X Salada" precisa de 1 item da categoria "Pão" (escolha obrigatória); recebido choiceProductId null',
    );
  });

  it('pão num item sem escolha → 422', () => {
    expect(check([item(9, 65)])).toThrow(
      '"X Salada" não tem escolha obrigatória; recebido choiceProductId 65, esperado null',
    );
  });

  it('produto de outra categoria como pão → 422', () => {
    expect(check([item(29, 33)])).toThrow(
      '"Add bacon" não é opção de "X Salada"; esperado 1 item da categoria "Pão"',
    );
  });

  it('linha gravada sem pão (antes da regra) passa enquanto não muda', () => {
    expect(check([item(29, null)], [saved(null)])).not.toThrow();
    expect(check([item(29, null, 2)], [saved(null)])).toThrow(
      'precisa de 1 item da categoria "Pão"',
    );
  });

  it('par lanche + pão já gravado passa mesmo se a escolha saiu da categoria', () => {
    const noChoice = new Map(products);
    noChoice.set(29, { ...products.get(29)!, choiceCategoryId: null });
    const previous = [saved(line(67))];
    expect(() =>
      assertRequiredChoices([item(29, 67)], noChoice, previous),
    ).not.toThrow();
  });

  it('produto que não existe fica para o preço (não recusa aqui)', () => {
    expect(check([item(999, null), item(29, 998)])).not.toThrow();
  });
});
