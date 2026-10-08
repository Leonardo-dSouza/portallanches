import type { AnalyticsReport } from '../api/analytics-types';

/** Sexta 25/09 comparada com a sexta anterior: X Salada no balcão, X Bacon na entrega da Ana. */
export function fridayAnalytics(): AnalyticsReport {
  return {
    from: '2026-09-25',
    to: '2026-09-25',
    totals: {
      orders: 2,
      revenue: '66.50',
      averageTicket: '33.25',
      counter: 1,
      deliveries: 1,
      deliveryFees: '5.00',
    },
    previous: {
      from: '2026-09-18',
      to: '2026-09-18',
      totals: {
        orders: 1,
        revenue: '33.25',
        averageTicket: '33.25',
        counter: 1,
        deliveries: 0,
        deliveryFees: '0.00',
      },
    },
    changes: {
      revenue: '100.0',
      orders: '100.0',
      averageTicket: '0.0',
      deliveries: null,
    },
    items: { itemsSold: 3, ordersWithoutItems: 0 },
    topProducts: [
      {
        productId: 9,
        name: 'X Salada',
        categoryName: 'Tradicional',
        quantity: 2,
        revenue: '35.60',
      },
      {
        productId: 10,
        name: 'X Bacon',
        categoryName: 'Artesanal',
        quantity: 1,
        revenue: '25.90',
      },
    ],
    leastSoldLanches: [
      {
        productId: 11,
        name: 'X Tudo',
        menuNumber: 11,
        categoryName: 'Tradicional',
        quantity: 0,
      },
    ],
    byCategory: [
      { categoryName: 'Tradicional', quantity: 2, revenue: '35.60' },
      { categoryName: 'Artesanal', quantity: 1, revenue: '25.90' },
    ],
    topNeighborhoods: [
      { neighborhood: 'Centro', deliveries: 1, revenue: '30.90' },
    ],
    topCustomers: [{ customerId: 7, name: 'Ana', orders: 1, revenue: '30.90' }],
    daily: [{ businessDate: '2026-09-25', orders: 2, revenue: '66.50' }],
    byWeekday: [
      {
        weekday: 5,
        nights: 1,
        orders: 2,
        revenue: '66.50',
        averageOrders: '2.0',
        averageRevenue: '66.50',
      },
    ],
    byPaymentMethod: [
      {
        paymentMethodId: 1,
        name: 'PIX',
        ordersCount: 1,
        total: '35.60',
        byMode: [],
      },
      {
        paymentMethodId: 3,
        name: 'Maquininha Tom',
        ordersCount: 1,
        total: '30.90',
        byMode: [{ mode: 'DEBIT', ordersCount: 1, total: '30.90' }],
      },
    ],
    withoutPaymentMethod: { count: 0, total: '0.00' },
  };
}

/** A semana da sexta acima: duas noites, para o gráfico dia a dia aparecer. */
export function weekAnalytics(): AnalyticsReport {
  const friday = fridayAnalytics();
  return {
    ...friday,
    from: '2026-09-22',
    to: '2026-09-28',
    previous: { ...friday.previous, from: '2026-09-15', to: '2026-09-21' },
    daily: [
      { businessDate: '2026-09-22', orders: 1, revenue: '20.00' },
      ...friday.daily,
    ],
  };
}
