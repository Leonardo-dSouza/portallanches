import { describe, expect, it } from 'vitest';
import type { ProductCostView, TargetStatus } from '../api/cost-types';
import { costTabSheet } from '../test-support/cost-tab-fixture';
import {
  belowTargetCount,
  countByStatus,
  filterByStatus,
} from './status-filter';

const product = (
  id: number,
  targetStatus: TargetStatus | null,
  cmvComplete = true,
): ProductCostView => ({
  id,
  name: `Lanche ${id}`,
  categoryId: 1,
  menuNumber: id,
  salePrice: '17.00',
  cmv: '8.00',
  cmvComplete,
  cmvPercent: '47.1',
  pv: '18.70',
  ifoodPv: '22.00',
  profit: '2.01',
  marginPercent: '11.8',
  profitTarget: '16',
  ownProfitTarget: false,
  targetStatus,
  belowTarget: targetStatus === 'below',
});

const products = [
  product(1, 'ok'),
  product(2, 'near'),
  product(3, 'near', false),
  product(4, 'below'),
  product(5, null),
];

describe('countByStatus', () => {
  it('conta todos, perto, abaixo e sem custo completo', () => {
    expect(countByStatus(products)).toEqual({
      all: 5,
      near: 2,
      below: 1,
      incomplete: 1,
    });
  });
});

describe('filterByStatus', () => {
  it.each([
    ['all', [1, 2, 3, 4, 5]],
    ['near', [2, 3]],
    ['below', [4]],
    ['incomplete', [3]],
  ] as const)('%s', (filter, ids) => {
    expect(filterByStatus(products, filter).map((p) => p.id)).toEqual(ids);
  });
});

describe('belowTargetCount', () => {
  it('conta só o abaixo da meta da categoria; zero não aparece', () => {
    const sheet = costTabSheet();
    expect(belowTargetCount(sheet, 1)).toBe(1);
    expect(belowTargetCount(sheet, 2)).toBeUndefined();
  });
});
