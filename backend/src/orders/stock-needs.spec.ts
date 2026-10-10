import type { OrderLine, SaleProduct } from './order-pricing.js';
import { saleNeeds } from './stock-needs.js';

const product = (
  id: number,
  components: SaleProduct['components'],
): SaleProduct => ({
  id,
  name: `Produto ${id}`,
  menuNumber: null,
  categoryId: 4,
  categoryName: 'Refrigerantes',
  addonCategoryId: null,
  isBundle: false,
  salePrice: '7.00',
  active: true,
  components,
});

const line = (productId: number, quantity: number): OrderLine => ({
  productId,
  productName: `Produto ${productId}`,
  menuNumber: null,
  categoryName: 'Refrigerantes',
  quantity,
  unitPrice: '7.00',
  unitCmv: null,
  cmvComplete: false,
});

const COCA = {
  supplyId: 30,
  quantity: '1',
  unitCost: '4.49',
  deductOnSale: true,
};
const PAO = {
  supplyId: 5,
  quantity: '1',
  unitCost: '0.8',
  deductOnSale: false,
};

describe('saleNeeds', () => {
  it('soma por insumo só o que tem baixa, vezes a quantidade da linha', () => {
    const products = new Map([
      [60, product(60, [COCA])],
      [9, product(9, [PAO])],
      [70, product(70, [PAO, { ...COCA, quantity: '2' }])],
    ]);
    const needs = saleNeeds([line(60, 3), line(9, 2), line(70, 1)], products);
    expect(needs).toEqual([{ supplyId: 30, milli: 5000 }]);
  });

  it('pedido sem bebida não baixa nada', () => {
    const products = new Map([[9, product(9, [PAO])]]);
    expect(saleNeeds([line(9, 1)], products)).toEqual([]);
  });
});
