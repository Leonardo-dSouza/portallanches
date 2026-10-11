import { treeOfOrderItems } from '../cash/item-tree';
import { storedItem, storedLine } from '../test-support/order-menu';
import { DEFAULT_TICKET_SETTINGS } from './ticket-settings';
import { ticketItemsOf } from './ticket-items';

const ACAI_RULES = {
  artisanalMark: 'Art',
  ticketAbbreviations: [
    { from: 'Leite condensado', to: 'LC' },
    { from: 'Leite em pó', to: 'LP' },
  ],
};

describe('ticketItemsOf', () => {
  it('lanche em duas linhas: adicional pelo preço de 1 lanche e, embaixo, o lanche completo', () => {
    // O exemplo do usuário (2026-10-11): 3 lanches, +1 cheddar e +2 ovo em cada um.
    const [item] = ticketItemsOf(
      treeOfOrderItems([
        storedItem(
          storedLine('X Bacon Salada', 'Tradicional', 3, '13.90', 14),
          [
            storedLine('Add cheddar', 'Adicionais', 3, '3.00'),
            storedLine('Add ovo', 'Adicionais', 6, '2.50'),
          ],
          'sem salada',
        ),
      ]),
      DEFAULT_TICKET_SETTINGS,
    );
    expect(item).toEqual({
      key: expect.any(String),
      layout: 'lanche',
      title: '3 X Bacon Salada',
      addons: [
        {
          key: expect.any(String),
          label: '+1 cheddar',
          unitPrice: '3.00',
          total: '3.00',
        },
        {
          key: expect.any(String),
          label: '+2 ovo',
          unitPrice: '2.50',
          total: '5.00',
        },
      ],
      note: 'sem salada',
      unitPrice: '21.90',
      total: '65.70',
    });
  });

  it('lanche sem adicional também em duas linhas, com a marca e as abreviações', () => {
    const [item] = ticketItemsOf(
      treeOfOrderItems([
        storedItem(storedLine('X Salada', 'Artesanal', 2, '25.90', 9)),
      ]),
      { artisanalMark: '(art)', ticketAbbreviations: [{ from: 'X', to: '' }] },
    );
    expect(item).toMatchObject({
      layout: 'lanche',
      title: '2 Salada (art)',
      addons: [],
      unitPrice: '25.90',
      total: '51.80',
    });
  });

  it('o resto numa linha, como antes: adicional com o total de todos os itens', () => {
    const [acai] = ticketItemsOf(
      treeOfOrderItems([
        storedItem(storedLine('Açaí 300ml', 'Açaí', 2, '8.50'), [
          storedLine('Leite condensado', 'Adicionais do açaí', 2, '3.50'),
          storedLine('Leite em pó', 'Adicionais do açaí', 4, '3.50'),
        ]),
      ]),
      ACAI_RULES,
    );
    expect(acai).toMatchObject({
      layout: 'inline',
      title: '2 Açaí 300ml',
      addons: [
        { label: '+1 LC', unitPrice: '3.50', total: '7.00' },
        { label: '+2 LP', unitPrice: '3.50', total: '14.00' },
      ],
      unitPrice: '8.50',
      total: '17.00',
    });
  });

  it('açaí sem adicional continua "Puro"; bebida sai com o nome abreviado', () => {
    const items = ticketItemsOf(
      treeOfOrderItems([
        storedItem(storedLine('Açaí 300ml', 'Açaí', 1, '8.50')),
        storedItem(storedLine('Coca Cola 600ml', 'Refrigerantes', 1, '7.00')),
      ]),
      {
        artisanalMark: 'Art',
        ticketAbbreviations: [{ from: 'Coca Cola', to: 'Coca' }],
      },
    );
    expect(items.map((item) => item.title)).toEqual([
      '1 Açaí 300ml Puro',
      '1 Coca 600ml',
    ]);
  });
});
