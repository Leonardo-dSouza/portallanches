import { BACON, COCA, OVO, X_SALADA } from '../test-support/order-menu';
import { addonChoices } from './addon-lookup';
import { addLine } from './order-lines';

const MENU = [X_SALADA, COCA, BACON, OVO];

describe('addonChoices', () => {
  it('os adicionais da categoria de adicionais do item', () => {
    const [line] = addLine([], X_SALADA, 1);
    expect(addonChoices(MENU, line).map((m) => m.name)).toEqual([
      'Add bacon',
      'Add ovo',
    ]);
  });

  it('item que não aceita adicionais não tem escolhas', () => {
    const [line] = addLine([], COCA, 1);
    expect(addonChoices(MENU, line)).toEqual([]);
  });
});
