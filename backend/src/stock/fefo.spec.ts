import { planCount, sortByExpiry, type LotBalance } from './fefo.js';

const lot = (
  id: number,
  remainingMilli: number,
  expiresOn: string | null,
): LotBalance => ({ id, remainingMilli, expiresOn });

describe('sortByExpiry', () => {
  it('validade crescente, sem validade por último, empate pelo lote mais antigo', () => {
    const sorted = sortByExpiry([
      lot(4, 1, null),
      lot(3, 1, '2026-10-15'),
      lot(2, 1, '2026-09-30'),
      lot(1, 1, '2026-10-15'),
    ]);
    expect(sorted.map((l) => l.id)).toEqual([2, 1, 3, 4]);
  });
});

describe('planCount', () => {
  // Exemplo do grill-me: lote X (vence 30/09) com 6, lote Y (15/10) com 6; contou 8.
  const X = lot(1, 6000, '2026-09-30');
  const Y = lot(2, 6000, '2026-10-15');

  it('tira a diferença do lote que vence primeiro', () => {
    expect(planCount([Y, X], 8000)).toEqual({
      takes: [{ lotId: 1, milli: 4000 }],
      surplusMilli: 0,
    });
  });

  it('esvazia um lote e continua no seguinte', () => {
    expect(planCount([X, Y, lot(3, 2000, null)], 1500)).toEqual({
      takes: [
        { lotId: 1, milli: 6000 },
        { lotId: 2, milli: 6000 },
        { lotId: 3, milli: 500 },
      ],
      surplusMilli: 0,
    });
  });

  it('contagem igual ao saldo não mexe em nada', () => {
    expect(planCount([X, Y], 12000)).toEqual({ takes: [], surplusMilli: 0 });
  });

  it('contou mais do que o sistema tinha: a diferença vira sobra', () => {
    expect(planCount([X], 7500)).toEqual({ takes: [], surplusMilli: 1500 });
    expect(planCount([], 3000)).toEqual({ takes: [], surplusMilli: 3000 });
  });

  it('contou zero: zera todos os lotes', () => {
    expect(planCount([X, Y], 0).takes).toEqual([
      { lotId: 1, milli: 6000 },
      { lotId: 2, milli: 6000 },
    ]);
  });
});
