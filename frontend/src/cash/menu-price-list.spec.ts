import { describe, expect, it } from 'vitest';
import { BACON, COCA, X_SALADA } from '../test-support/order-menu';
import { TWO_X_SALADA } from '../test-support/order-form-fixtures';
import { menuForType, repricedLines, samePriceList } from './menu-price-list';

const PAO = { ...COCA, id: 70, name: 'Pão Brioche', salePrice: '0.00' };
const MENU = [{ ...X_SALADA, ifoodPrice: '24.90' }, COCA, BACON, PAO];

describe('menu-price-list (iFood, 2026-11-23)', () => {
  it('no iFood fica só o que tem preço iFood, com ele, e o grátis', () => {
    const menu = menuForType(MENU, 'IFOOD');
    expect(menu.map((item) => [item.name, item.salePrice])).toEqual([
      ['X Salada', '24.90'],
      ['Pão Brioche', '0.00'],
    ]);
  });

  it('balcão e entrega usam o cardápio como veio', () => {
    expect(menuForType(MENU, 'COUNTER')).toBe(MENU);
    expect(menuForType(MENU, 'DELIVERY')).toBe(MENU);
  });

  it('só o iFood muda a lista de preços', () => {
    expect(samePriceList('COUNTER', 'DELIVERY')).toBe(true);
    expect(samePriceList('COUNTER', 'IFOOD')).toBe(false);
  });

  it('as linhas digitadas vão para o preço novo; o que falta fica como estava', () => {
    const lines = [
      ...TWO_X_SALADA,
      { ...TWO_X_SALADA[0], id: 2, productId: COCA.id, unitPrice: '7.00' },
    ];
    const repriced = repricedLines(lines, menuForType(MENU, 'IFOOD'));
    expect(repriced.map((line) => line.unitPrice)).toEqual(['24.90', '7.00']);
  });
});
