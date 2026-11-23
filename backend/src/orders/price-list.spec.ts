import { FakeOrderCatalog } from './order-catalog-fakes.fixture.js';
import { priceListOf, withPriceList } from './price-list.js';

describe('price-list', () => {
  const [xSalada] = new FakeOrderCatalog().products;

  it('só o pedido do iFood usa a lista do iFood', () => {
    expect(
      ['COUNTER', 'DELIVERY', 'IFOOD'].map((t) => priceListOf(t as never)),
    ).toEqual(['STORE', 'STORE', 'IFOOD']);
  });

  it('no iFood o preço da linha vira o preço iFood', () => {
    const priced = withPriceList({ ...xSalada, ifoodPrice: '24.90' }, 'IFOOD');
    expect(priced.salePrice).toBe('24.90');
  });

  it('sem preço iFood, fica sem preço (o pricing recusa)', () => {
    expect(withPriceList(xSalada, 'IFOOD').salePrice).toBeNull();
  });

  it('no balcão nada muda', () => {
    const product = { ...xSalada, ifoodPrice: '24.90' };
    expect(withPriceList(product, 'STORE')).toBe(product);
  });
});
