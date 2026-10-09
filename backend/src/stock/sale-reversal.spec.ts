import { netTakenByLot } from './sale-reversal.js';

describe('netTakenByLot', () => {
  it('devolve por lote o que a venda tirou e ainda não voltou', () => {
    const moves = [
      { lotId: 1, supplyId: 30, milli: -3000 },
      { lotId: 2, supplyId: 30, milli: -1000 },
      { lotId: 1, supplyId: 30, milli: 3000 },
      { lotId: 1, supplyId: 30, milli: -2000 },
    ];
    expect(netTakenByLot(moves)).toEqual([
      { lotId: 1, supplyId: 30, milli: 2000 },
      { lotId: 2, supplyId: 30, milli: 1000 },
    ]);
  });

  it('venda já devolvida inteira não devolve de novo', () => {
    const moves = [
      { lotId: 1, supplyId: 30, milli: -3000 },
      { lotId: 1, supplyId: 30, milli: 3000 },
    ];
    expect(netTakenByLot(moves)).toEqual([]);
  });
});
