import { saleMenuOn, type DatedMenuEntry } from './sale-menu.js';

const DAY = '2026-10-05';

const entry = (overrides: Partial<DatedMenuEntry>): DatedMenuEntry => ({
  id: 9,
  name: 'X Salada',
  menuNumber: 9,
  categoryName: 'Tradicional',
  salePrice: '19.90',
  active: true,
  deactivatedOn: null,
  supersededPrice: null,
  stockComponents: [],
  ...overrides,
});

const LATA = { supplyId: 30, milli: 1000 };

describe('saleMenuOn', () => {
  it('devolve o item com o preço que valia no dia', () => {
    const menu = saleMenuOn([entry({ supersededPrice: '17.80' })], DAY, null);
    expect(menu).toEqual([
      {
        id: 9,
        name: 'X Salada',
        menuNumber: 9,
        categoryName: 'Tradicional',
        salePrice: '17.80',
        stockLeft: null,
      },
    ]);
  });

  it('tira o item sem preço e o que não vendia no dia, na ordem recebida', () => {
    const menu = saleMenuOn(
      [
        entry({ id: 1, salePrice: null }),
        entry({ id: 2, active: false, deactivatedOn: DAY }),
        entry({ id: 3, active: false, deactivatedOn: '2026-10-06' }),
        entry({ id: 4 }),
      ],
      DAY,
      null,
    );
    expect(menu.map((item) => item.id)).toEqual([3, 4]);
  });
});

describe('saleMenuOn: saldo no caixa', () => {
  const coca = entry({ id: 68, name: 'Coca lata', stockComponents: [LATA] });

  it('mostra o saldo quando está abaixo do aviso', () => {
    const stock = { balances: new Map([[30, 5000]]), warnBelow: 6 };
    expect(saleMenuOn([coca], DAY, stock)[0].stockLeft).toBe(5);
  });

  it('no aviso ou acima não mostra', () => {
    const stock = { balances: new Map([[30, 6000]]), warnBelow: 6 };
    expect(saleMenuOn([coca], DAY, stock)[0].stockLeft).toBeNull();
  });

  it('sem estoque mostra zero; item sem baixa nunca mostra', () => {
    const stock = { balances: new Map<number, number>(), warnBelow: 6 };
    const menu = saleMenuOn([coca, entry({ id: 9 })], DAY, stock);
    expect(menu.map((item) => item.stockLeft)).toEqual([0, null]);
  });
});
