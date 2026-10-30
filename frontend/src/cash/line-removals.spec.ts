import type { DraftLine } from './order-lines';
import { choiceRemoved, toggleRemoval } from './line-removals';

const ALFACE = { supplyId: 1, name: 'Alface' };
const TOMATE = { supplyId: 2, name: 'Tomate' };
const SALADA = { key: 'salada', label: 'Salada', supplies: [ALFACE, TOMATE] };
const SO_TOMATE = { key: '2', label: 'Tomate', supplies: [TOMATE] };

const line = (removals: DraftLine['removals'] = []) =>
  ({ id: 1, removals }) as DraftLine;
const other = { id: 2, removals: [] } as unknown as DraftLine;

describe('toggleRemoval', () => {
  it('retira só o tomate, sem mexer nas outras linhas', () => {
    const [changed, untouched] = toggleRemoval([line(), other], 1, SO_TOMATE);
    expect(changed.removals).toEqual([TOMATE]);
    expect(untouched).toBe(other);
  });

  it('apertar de novo devolve', () => {
    expect(toggleRemoval([line([TOMATE])], 1, SO_TOMATE)[0].removals).toEqual(
      [],
    );
  });

  it('Salada retira os dois; com só um retirado, completa sem repetir', () => {
    expect(toggleRemoval([line()], 1, SALADA)[0].removals).toEqual([
      ALFACE,
      TOMATE,
    ]);
    expect(toggleRemoval([line([TOMATE])], 1, SALADA)[0].removals).toEqual([
      TOMATE,
      ALFACE,
    ]);
  });

  it('Salada com os dois retirados devolve os dois', () => {
    const removals = [ALFACE, TOMATE];
    expect(toggleRemoval([line(removals)], 1, SALADA)[0].removals).toEqual([]);
  });
});

describe('choiceRemoved', () => {
  it('a tecla fica ligada só com todos os ingredientes dela retirados', () => {
    expect(choiceRemoved(line([TOMATE]), SO_TOMATE)).toBe(true);
    expect(choiceRemoved(line([TOMATE]), SALADA)).toBe(false);
    expect(choiceRemoved(line([ALFACE, TOMATE]), SALADA)).toBe(true);
  });
});
