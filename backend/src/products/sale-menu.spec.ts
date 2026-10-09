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
  ...overrides,
});

describe('saleMenuOn', () => {
  it('devolve o item com o preço que valia no dia', () => {
    const menu = saleMenuOn([entry({ supersededPrice: '17.80' })], DAY);
    expect(menu).toEqual([
      {
        id: 9,
        name: 'X Salada',
        menuNumber: 9,
        categoryName: 'Tradicional',
        salePrice: '17.80',
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
    );
    expect(menu.map((item) => item.id)).toEqual([3, 4]);
  });
});
