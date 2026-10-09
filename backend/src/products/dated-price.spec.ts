import { priceOnDate, type DatedProduct } from './dated-price.js';

const DAY = '2026-10-05';

const X_SALADA: DatedProduct = {
  salePrice: '19.90',
  active: true,
  deactivatedOn: null,
  supersededPrice: null,
};

describe('priceOnDate', () => {
  it('sem histórico vale o preço atual', () => {
    expect(priceOnDate(X_SALADA, DAY)).toEqual({
      salePrice: '19.90',
      sellable: true,
    });
  });

  it('com histórico vale o preço da época', () => {
    const product = { ...X_SALADA, supersededPrice: '17.80' };
    expect(priceOnDate(product, DAY).salePrice).toBe('17.80');
  });

  it('item que saiu depois do dia ainda vende nele', () => {
    const product = { ...X_SALADA, active: false, deactivatedOn: '2026-10-06' };
    expect(priceOnDate(product, DAY).sellable).toBe(true);
  });

  it('item que saiu no próprio dia não vende nele', () => {
    const product = { ...X_SALADA, active: false, deactivatedOn: DAY };
    expect(priceOnDate(product, DAY).sellable).toBe(false);
  });

  it('item inativo sem dia de saída nunca vende', () => {
    const product = { ...X_SALADA, active: false };
    expect(priceOnDate(product, DAY).sellable).toBe(false);
  });
});
