import { costOf } from './consumption-cost';

describe('costOf', () => {
  it('devolve o custo que a API mandou (admin)', () => {
    expect(costOf({ cmvTotal: '9.58', missingCostCount: 1 })).toEqual({
      cmvTotal: '9.58',
      missingCostCount: 1,
    });
  });

  it('sem os campos (caixa) não há custo para mostrar', () => {
    expect(costOf({})).toBeNull();
  });
});
