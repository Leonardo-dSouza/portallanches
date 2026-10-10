import { analyticsOrder, deliveryOrder } from './analytics.fixture.js';
import { topCustomers, topNeighborhoods } from './delivery-ranking.js';

const ANA = { id: 7, name: 'Ana' };
const BIA = { id: 8, name: 'Bia' };
const ORDERS = [
  deliveryOrder('40.00', 'Centro', ANA),
  deliveryOrder('20.00', 'Centro', BIA),
  deliveryOrder('35.00', 'Monterrey', ANA, { customerName: 'Ana Paula' }),
  analyticsOrder('99.00'),
];

describe('topNeighborhoods', () => {
  it('bairros por número de entregas, com o faturamento; balcão fica de fora', () => {
    expect(topNeighborhoods(ORDERS, 10)).toEqual([
      { neighborhood: 'Centro', deliveries: 2, revenue: '60.00' },
      { neighborhood: 'Monterrey', deliveries: 1, revenue: '35.00' },
    ]);
  });
});

describe('topClients', () => {
  it('clientes por número de pedidos (desempate pelo gasto), com o nome mais recente', () => {
    expect(topCustomers(ORDERS, 1)).toEqual([
      { customerId: 7, name: 'Ana Paula', orders: 2, revenue: '75.00' },
    ]);
  });

  // 2026-10-10: o balcão grava o nome da pessoa (conta aberta), mas sem cadastro de cliente.
  it('o nome do balcão (sem cliente cadastrado) não entra no ranking', () => {
    const counterWithName = analyticsOrder('80.00', { customerName: 'Maria' });
    expect(
      topCustomers([...ORDERS, counterWithName], 10).map((c) => c.name),
    ).toEqual(['Ana Paula', 'Bia']);
  });
});
