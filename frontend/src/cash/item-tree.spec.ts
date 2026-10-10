import {
  BACON,
  storedItem,
  storedLine,
  X_SALADA,
} from '../test-support/order-menu';
import {
  addonLabel,
  describeItems,
  treeOfDraft,
  treeOfOrderItems,
} from './item-tree';
import { changeAddon, setNote } from './line-addons';
import { addLine } from './order-lines';

describe('addonLabel', () => {
  it('"Add bacon" vira "com bacon"; mais de um por unidade leva a quantidade', () => {
    expect(addonLabel('Add bacon', 1)).toBe('com bacon');
    expect(addonLabel('Granola', 2)).toBe('com 2× Granola');
  });
});

describe('treeOfOrderItems', () => {
  it('adicionais (por unidade) e observação embaixo do item', () => {
    const rows = treeOfOrderItems([
      storedItem(
        storedLine('X Salada', 'Tradicional', 2),
        [storedLine('Add bacon', 'Adicionais', 2)],
        'Sem tomate',
      ),
      storedItem(storedLine('X Burguer', 'Artesanal', 1)),
    ]);
    expect(rows.map(({ key: _key, ...row }) => row)).toEqual([
      {
        quantity: 2,
        name: 'X Salada',
        artisanal: false,
        details: ['com bacon', 'Sem tomate'],
      },
      { quantity: 1, name: 'X Burguer', artisanal: true, details: [] },
    ]);
  });
});

describe('treeOfDraft', () => {
  it('a comanda enquanto digita mostra a mesma árvore', () => {
    let lines = addLine([], X_SALADA, 1);
    lines = setNote(
      changeAddon(lines, lines[0].id, BACON, 1),
      lines[0].id,
      'sem tomate',
    );
    expect(treeOfDraft(lines)[0].details).toEqual(['com bacon', 'sem tomate']);
  });
});

describe('describeItems', () => {
  it('uma linha de texto (título da lista): quantidade, artesanal e os detalhes', () => {
    expect(
      describeItems([
        storedItem(
          storedLine('X Salada', 'Tradicional', 2),
          [storedLine('Add bacon', 'Adicionais', 2)],
          'sem tomate',
        ),
        storedItem(storedLine('X Salada', 'Artesanal', 1)),
        storedItem(storedLine('Coca Cola 600ml', 'Refrigerantes', 1)),
      ]),
    ).toBe(
      '2× X Salada (com bacon; sem tomate), X Salada (art.), Coca Cola 600ml',
    );
  });
});
