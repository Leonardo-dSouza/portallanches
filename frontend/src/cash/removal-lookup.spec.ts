import type { MenuItem } from './menu-lookup';
import type { DraftLine } from './order-lines';
import { removalChoices, searchRemovals } from './removal-lookup';

const ALFACE = { supplyId: 1, name: 'Alface' };
const TOMATE = { supplyId: 2, name: 'Tomate' };
const OVO = { supplyId: 3, name: 'Ovo' };

const menu = (removables: MenuItem['removables']): MenuItem[] => [
  { id: 9, name: 'X Salada', removables } as MenuItem,
];
const line = (removals: DraftLine['removals'] = []): DraftLine =>
  ({ id: 1, productId: 9, name: 'X Salada', removals }) as DraftLine;

describe('removalChoices', () => {
  it('com alface e tomate, a tecla Salada vem primeiro e as duas ficam soltas', () => {
    const choices = removalChoices(menu([ALFACE, OVO, TOMATE]), line());
    expect(choices.map((c) => c.label)).toEqual([
      'Salada',
      'Alface',
      'Ovo',
      'Tomate',
    ]);
    expect(choices[0].supplies).toEqual([ALFACE, TOMATE]);
  });

  it('sem os dois na receita, não há tecla Salada', () => {
    const choices = removalChoices(menu([TOMATE, OVO]), line());
    expect(choices.map((c) => c.label)).toEqual(['Tomate', 'Ovo']);
  });

  it('retirada gravada que saiu da receita continua na lista, para poder devolver', () => {
    const choices = removalChoices(menu([OVO]), line([TOMATE]));
    expect(choices.map((c) => c.label)).toEqual(['Ovo', 'Tomate']);
  });

  it('item sem nada para tirar devolve vazio', () => {
    expect(removalChoices(menu([]), line())).toEqual([]);
  });
});

describe('searchRemovals', () => {
  const choices = removalChoices(menu([ALFACE, OVO, TOMATE]), line());

  it('acha sem acento nem caixa, e "tomate" pega só o tomate', () => {
    const found = searchRemovals(choices, 'TOMATE');
    expect(found.map((c) => c.label)).toEqual(['Tomate']);
    expect(found[0].supplies).toEqual([TOMATE]);
  });

  it('"salada" pega a tecla dos dois', () => {
    expect(searchRemovals(choices, 'sal')[0].supplies).toEqual([
      ALFACE,
      TOMATE,
    ]);
  });
});
