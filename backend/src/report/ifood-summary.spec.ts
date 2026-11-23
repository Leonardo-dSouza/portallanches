import { ifoodSummary, splitIfood } from './ifood-summary.js';

describe('ifood-summary', () => {
  it('soma bruto, comissão (arredondada por pedido) e líquido', () => {
    expect(
      ifoodSummary([
        { amount: '49.80', ifoodCommissionPercent: '28.00' },
        { amount: '24.90', ifoodCommissionPercent: '27.50' },
      ]),
    ).toEqual({ count: 2, gross: '74.70', commission: '20.79', net: '53.91' });
  });

  it('sem pedido do iFood tudo zera', () => {
    expect(ifoodSummary([])).toEqual({
      count: 0,
      gross: '0.00',
      commission: '0.00',
      net: '0.00',
    });
  });

  it('separa o iFood do resto; importado (sem tipo) fica nas vendas', () => {
    const { store, ifood } = splitIfood([
      { type: 'COUNTER' as const },
      { type: 'IFOOD' as const },
      { type: null },
    ]);
    expect([store.length, ifood.length]).toEqual([2, 1]);
  });
});
