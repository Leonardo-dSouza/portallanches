import { analyticsOrder, soldItem } from './analytics.fixture.js';
import type { CategoryOrderRow } from './analytics-source.js';
import {
  itemsSummary,
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
  analyticsOrder('67.80', {
    items: [
      soldItem(9, 'X Salada', { unitPrice: '17.80' }),
      soldItem(70, 'Combo antigo', {
        categoryName: 'Promoção',
        unitPrice: '50.00',
      }),
    ],
  }),
  analyticsOrder('36.40', { type: null }),
];

// Ordem do cadastro; "Promoção" não existe mais nele e o Açaí não vendeu nada.
const CATEGORY_ORDER: CategoryOrderRow[] = [
  { name: 'Tradicional', sortOrder: 1 },
  { name: 'Artesanal', sortOrder: 2 },
  { name: 'Refrigerantes', sortOrder: 4 },
  { name: 'Açaí', sortOrder: 7 },
];

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
        productId: 70,
        name: 'Combo antigo',
        categoryName: 'Promoção',
        quantity: 1,
        revenue: '50.00',
      },
    ]);
  });
});

describe('salesByCategory', () => {
  it('na ordem do cardápio, sem as zeradas; categoria fora do cadastro vai para o fim', () => {
    expect(
      salesByCategory(ORDERS, CATEGORY_ORDER).map((c) => c.categoryName),
    ).toEqual(['Tradicional', 'Artesanal', 'Refrigerantes', 'Promoção']);
  });

  it('cada categoria traz os itens dela, do que mais saiu ao que menos', () => {
    const orders = [
      analyticsOrder('40.00', {
        items: [
          soldItem(1, 'Hot Dog', { unitPrice: '18.10' }),
          soldItem(9, 'X Salada', { quantity: 2, unitPrice: '17.80' }),
        ],
      }),
    ];
    expect(salesByCategory(orders, CATEGORY_ORDER)).toEqual([
      {
        categoryName: 'Tradicional',
        quantity: 3,
        revenue: '53.70',
        products: [
          {
            productId: 9,
            name: 'X Salada',
            categoryName: 'Tradicional',
            quantity: 2,
            revenue: '35.60',
          },
          {
            productId: 1,
            name: 'Hot Dog',
            categoryName: 'Tradicional',
            quantity: 1,
            revenue: '18.10',
          },
        ],
      },
    ]);
  });
});

describe('itemsSummary', () => {
  it('conta os itens vendidos e os pedidos sem itens (importados)', () => {
    expect(itemsSummary(ORDERS)).toEqual({
      itemsSold: 6,
      ordersWithoutItems: 1,
    });
  });
});
