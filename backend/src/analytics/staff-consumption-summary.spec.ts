import type { OrderEntry } from '../orders/order-pricing.js';
import type { AnalyticsStaffConsumptionRow } from './analytics-source.js';
import { staffConsumptionSummary } from './staff-consumption-summary.js';

const entry = (
  productName: string,
  quantity: number,
  unitCmv: string | null,
  categoryName = 'Tradicional',
): OrderEntry => ({
  productId: 1,
  productName,
  menuNumber: null,
  categoryName,
  quantity,
  unitPrice: '10.00',
  unitCmv,
  cmvComplete: unitCmv !== null,
  note: null,
  addons: [],
});

const row = (
  consumerName: string,
  items: OrderEntry[],
): AnalyticsStaffConsumptionRow => ({
  consumerName,
  consumerKey: consumerName.toLowerCase(),
  items,
});

const ROWS = [
  row('Bianca', [entry('Misto Quente', 1, '7.00')]),
  row('Motoboy', [entry('X Calafrango', 1, '12.40')]),
  row('bianca', [entry('Misto Quente', 2, '7.00')]),
  row('Equipe', [entry('It Laranja 2L', 1, '6.15', 'Refrigerantes')]),
  row('Leo', [entry('Açaí 500ml', 1, null, 'Açaí')]),
];

describe('staffConsumptionSummary', () => {
  it('soma os lançamentos do período pelo custo', () => {
    expect(staffConsumptionSummary(ROWS, 10)).toMatchObject({
      count: 5,
      cmvTotal: '39.55',
      missingCostCount: 1,
    });
  });

  it('por pessoa, do maior custo ao menor, com a grafia mais recente do nome', () => {
    expect(staffConsumptionSummary(ROWS, 10).byPerson).toEqual([
      { name: 'bianca', count: 2, cmvTotal: '21.00', missingCostCount: 0 },
      { name: 'Motoboy', count: 1, cmvTotal: '12.40', missingCostCount: 0 },
      { name: 'Equipe', count: 1, cmvTotal: '6.15', missingCostCount: 0 },
      { name: 'Leo', count: 1, cmvTotal: '0.00', missingCostCount: 1 },
    ]);
  });

  it('itens mais consumidos pela quantidade, até o limite', () => {
    expect(staffConsumptionSummary(ROWS, 2).topItems).toEqual([
      { name: 'Misto Quente', categoryName: 'Tradicional', quantity: 3 },
      { name: 'X Calafrango', categoryName: 'Tradicional', quantity: 1 },
    ]);
  });

  it('período sem consumo', () => {
    expect(staffConsumptionSummary([], 10)).toEqual({
      count: 0,
      cmvTotal: '0.00',
      missingCostCount: 0,
      byPerson: [],
      topItems: [],
    });
  });
});
