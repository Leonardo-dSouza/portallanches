import { storedItem, storedLine } from '../test-support/order-menu';
import { addedItems } from './added-items';

const line = (name: string, quantity: number, productId = 1) => ({
  ...storedLine(name, 'Tradicional', quantity, '10.00'),
  productId,
});
const bacon = (quantity: number) => ({
  ...storedLine('Add bacon', 'Adicionais', quantity, '6.00'),
  productId: 33,
});

describe('addedItems', () => {
  it('sem item novo, nada a imprimir', () => {
    const items = [storedItem(line('X Salada', 1))];
    expect(addedItems(items, items)).toEqual([]);
  });

  it('item novo e o que aumentou entram só com a diferença', () => {
    const before = [
      storedItem(line('X Salada', 1)),
      storedItem(line('Coca', 1, 5)),
    ];
    const after = [
      storedItem(line('X Salada', 1)),
      storedItem(line('Coca', 3, 5)),
      storedItem(line('X Tudo', 1, 7)),
    ];
    expect(
      addedItems(before, after).map((i) => [i.productName, i.quantity]),
    ).toEqual([
      ['Coca', 2],
      ['X Tudo', 1],
    ]);
  });

  it('o mesmo lanche com outro adicional ou outra observação é item novo', () => {
    const before = [storedItem(line('X Salada', 1))];
    const after = [
      storedItem(line('X Salada', 1)),
      storedItem(line('X Salada', 2), [bacon(2)]),
      storedItem(line('X Salada', 1), [], 'sem tomate'),
    ];
    const added = addedItems(before, after);
    expect(
      added.map((i) => [i.quantity, i.addons.map((a) => a.quantity), i.note]),
    ).toEqual([
      [2, [2], null],
      [1, [], 'sem tomate'],
    ]);
  });

  it('aumentar um lanche com adicional leva o adicional na mesma proporção', () => {
    const before = [storedItem(line('X Salada', 1), [bacon(1)])];
    const after = [storedItem(line('X Salada', 3), [bacon(3)])];
    const [added] = addedItems(before, after);
    expect([added.quantity, added.addons[0].quantity]).toEqual([2, 2]);
  });
});
