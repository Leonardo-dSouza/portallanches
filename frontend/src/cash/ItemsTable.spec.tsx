import { render, screen, within } from '@testing-library/react';
import { storedItem, storedLine } from '../test-support/order-menu';
import { treeOfOrderItems } from './item-tree';
import { ItemsTable } from './ItemsTable';

const rowTexts = () =>
  screen.getAllByRole('row').map((row) =>
    within(row)
      .queryAllByRole('cell')
      .map((cell) => cell.textContent),
  );

describe('ItemsTable', () => {
  it('Qtd, Item, Unit. e Total; o adicional com o preço dele e a observação embaixo', () => {
    render(
      <ItemsTable
        rows={treeOfOrderItems([
          storedItem(
            storedLine('X Salada', 'Tradicional', 2, '17.80'),
            [storedLine('Add bacon', 'Adicionais', 2, '6.00')],
            'sem tomate',
          ),
          storedItem(storedLine('Açaí 300ml', 'Açaí', 1, '8.50')),
          storedItem(storedLine('X Salada', 'Artesanal', 1, '25.90')),
        ])}
      />,
    );
    expect(
      screen.getAllByRole('columnheader').map((th) => th.textContent),
    ).toEqual(['Qtd', 'Item', 'Unit.', 'Total']);
    expect(rowTexts().slice(1)).toEqual([
      ['2×', 'X Salada', '17,80', '35,60'],
      ['', '+ bacon', '6,00', '12,00'],
      ['', 'sem tomate'],
      ['1×', 'Açaí 300ml Puro', '8,50', '8,50'],
      ['1×', 'X Salada Art', '25,90', '25,90'],
    ]);
  });
});

describe('ItemsTable: retirada', () => {
  it('sai embaixo do item, sem preço, e o valor do lanche fica igual', () => {
    const lanche = storedItem(storedLine('X Egg', 'Tradicional', 1, '19.00'));
    render(
      <ItemsTable
        rows={treeOfOrderItems([
          { ...lanche, removals: [{ supplyId: 3, supplyName: 'Ovo' }] },
        ])}
      />,
    );
    expect(rowTexts()).toContainEqual(['', 's/ Ovo']);
    expect(rowTexts()).toContainEqual(['1×', 'X Egg', '19,00', '19,00']);
  });
});
