import type { OrderEntry, OrderLine } from '../orders/order-pricing.js';
import { consumptionCost, sumConsumptionCosts } from './consumption-cost.js';

const line = (
  productName: string,
  quantity: number,
  unitCmv: string | null,
): OrderLine => ({
  productId: 1,
  productName,
  menuNumber: null,
  categoryName: 'Tradicional',
  quantity,
  unitPrice: '10.00',
  unitCmv,
  cmvComplete: unitCmv !== null,
});

const entry = (base: OrderLine, addons: OrderLine[] = []): OrderEntry => ({
  ...base,
  note: null,
  addons,
});

describe('consumptionCost', () => {
  it('soma o CMV de cada linha vezes a quantidade, com os adicionais', () => {
    const misto = entry(line('Misto Quente', 2, '4.10'), [
      line('Add bacon', 2, '1.55'),
    ]);

    expect(consumptionCost([misto])).toEqual({
      cmvTotal: '11.30',
      missingCostCount: 0,
    });
  });

  it('item sem composição conta uma vez por unidade, com os adicionais juntos', () => {
    const acai = entry(line('Açaí 500ml', 1, null), [
      line('Leite condensado', 1, null),
      line('Leite em pó', 1, null),
    ]);
    const refri = entry(line('It Laranja 2L', 1, '6.90'));

    expect(consumptionCost([acai, refri])).toEqual({
      cmvTotal: '6.90',
      missingCostCount: 1,
    });
  });

  it('adicional sem custo marca o item inteiro como sem custo', () => {
    const lanche = entry(line('X Salada', 3, '5.00'), [
      line('Add nada', 3, null),
    ]);

    expect(consumptionCost([lanche])).toEqual({
      cmvTotal: '15.00',
      missingCostCount: 3,
    });
  });
});

describe('sumConsumptionCosts', () => {
  it('conta os lançamentos e soma o custo e os itens sem custo', () => {
    const costs = [
      { cmvTotal: '15.57', missingCostCount: 0 },
      { cmvTotal: '6.15', missingCostCount: 1 },
    ];

    expect(sumConsumptionCosts(costs)).toEqual({
      count: 2,
      cmvTotal: '21.72',
      missingCostCount: 1,
    });
  });

  it('sem lançamentos dá zero', () => {
    expect(sumConsumptionCosts([])).toEqual({
      count: 0,
      cmvTotal: '0.00',
      missingCostCount: 0,
    });
  });
});
