import { analyticsOrder, soldItem } from './analytics.fixture.js';
import type { MenuLancheRow } from './analytics-source.js';
import {
  itemsSummary,
  leastSoldLanches,
  salesByCategory,
  topProducts,
} from './product-ranking.js';

const ORDERS = [
  analyticsOrder('47.00', {
    items: [
      soldItem(9, 'X Salada', { quantity: 2, unitPrice: '17.80' }),
      soldItem(60, 'Coca Cola 600ml', {
        categoryName: 'Refrigerantes',
        unitPrice: '7.00',
      }),
    ],
  }),
  analyticsOrder('25.90', {
    items: [
      soldItem(10, 'X Bacon', {
        categoryName: 'Artesanal',
        unitPrice: '25.90',
      }),
    ],
  }),
  analyticsOrder('17.80', {
    items: [soldItem(9, 'X Salada', { unitPrice: '17.80' })],
  }),
  analyticsOrder('36.40', { type: null }),
];

const lanche = (
  id: number,
  name: string,
  menuNumber: number,
): MenuLancheRow => ({
  id,
  name,
  menuNumber,
  categoryName: 'Tradicional',
});

describe('topProducts', () => {
  it('ordena por quantidade (desempate pelo faturamento) e corta no limite', () => {
    expect(topProducts(ORDERS, 2)).toEqual([
      {
        productId: 9,
        name: 'X Salada',
        categoryName: 'Tradicional',
        quantity: 3,
        revenue: '53.40',
      },
      {
        productId: 10,
        name: 'X Bacon',
        categoryName: 'Artesanal',
        quantity: 1,
        revenue: '25.90',
      },
    ]);
  });
});

describe('leastSoldLanches', () => {
  it('lanches ativos do cardápio do que menos vendeu ao que mais, incluindo os zerados', () => {
    const lanches = [
      lanche(9, 'X Salada', 9),
      lanche(10, 'X Bacon', 10),
      lanche(11, 'X Tudo', 11),
    ];
    expect(leastSoldLanches(ORDERS, lanches, 2)).toEqual([
      {
        productId: 11,
        name: 'X Tudo',
        menuNumber: 11,
        categoryName: 'Tradicional',
        quantity: 0,
      },
      {
        productId: 10,
        name: 'X Bacon',
        menuNumber: 10,
        categoryName: 'Tradicional',
        quantity: 1,
      },
    ]);
  });
});

describe('salesByCategory', () => {
  it('soma quantidade e faturamento por categoria, do maior faturamento ao menor', () => {
    expect(salesByCategory(ORDERS)).toEqual([
      { categoryName: 'Tradicional', quantity: 3, revenue: '53.40' },
      { categoryName: 'Artesanal', quantity: 1, revenue: '25.90' },
      { categoryName: 'Refrigerantes', quantity: 1, revenue: '7.00' },
    ]);
  });
});

describe('itemsSummary', () => {
  it('conta os itens vendidos e os pedidos sem itens (importados)', () => {
    expect(itemsSummary(ORDERS)).toEqual({
      itemsSold: 5,
      ordersWithoutItems: 1,
    });
  });
});
