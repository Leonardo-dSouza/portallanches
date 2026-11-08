import {
  BREAD_MENU,
  COCA,
  PAO_BRIOCHE,
  X_SALADA,
  X_SALADA_ART,
} from '../test-support/order-menu';
import {
  choiceOptions,
  choicePending,
  choiceSubject,
  firstPendingChoice,
  sellableMenu,
  setChoice,
} from './line-choice';
import { addLine, type DraftLine } from './order-lines';

const artisanal = (): DraftLine => addLine([], X_SALADA_ART, 1)[0];

describe('choiceOptions', () => {
  it('lista os pães na ordem das teclas (sortOrder), não na do cardápio', () => {
    expect(choiceOptions(BREAD_MENU, artisanal()).map((o) => o.name)).toEqual([
      'Pão Gergelim',
      'Pão Brioche',
      'Pão Tradicional',
    ]);
  });

  it('item sem escolha não tem opções', () => {
    expect(choiceOptions(BREAD_MENU, addLine([], X_SALADA, 1)[0])).toEqual([]);
  });
});

describe('choiceSubject', () => {
  it('a categoria Pão vira "o pão"; outra fica com o nome', () => {
    expect(choiceSubject(choiceOptions(BREAD_MENU, artisanal()))).toBe('o pão');
    expect(choiceSubject([{ ...COCA, categoryName: 'Ponto' }])).toBe('Ponto');
  });
});

describe('choicePending', () => {
  it('artesanal novo sem pão está pendente; com pão, não', () => {
    const line = artisanal();
    expect(choicePending(BREAD_MENU, line, [])).toBe(true);
    const [chosen] = setChoice([line], line.id, PAO_BRIOCHE);
    expect(choicePending(BREAD_MENU, chosen, [])).toBe(false);
  });

  it('artesanal gravado sem pão passa enquanto não muda (2026-11-08)', () => {
    const saved = { ...artisanal(), savedId: 1 };
    expect(choicePending(BREAD_MENU, saved, [saved])).toBe(false);
    const more = { ...saved, quantity: 2 };
    expect(choicePending(BREAD_MENU, more, [saved])).toBe(true);
  });

  it('a primeira pendente é achada entre as linhas', () => {
    const lines = [addLine([], X_SALADA, 1)[0], { ...artisanal(), id: 2 }];
    expect(firstPendingChoice(lines, BREAD_MENU, [])?.id).toBe(2);
  });
});

describe('setChoice', () => {
  it('põe o pão com o preço do dia só na linha certa', () => {
    const lines = [artisanal(), { ...artisanal(), id: 2 }];
    const next = setChoice(lines, 2, PAO_BRIOCHE);
    expect(next[0].choice).toBeNull();
    expect(next[1].choice).toEqual({
      productId: 67,
      name: 'Pão Brioche',
      unitPrice: '0.00',
    });
  });
});

describe('sellableMenu', () => {
  it('tira as opções de escolha do cardápio de venda (o pão não se vende sozinho)', () => {
    expect(sellableMenu(BREAD_MENU).map((item) => item.name)).toEqual([
      'X Salada',
      'X Salada',
      'Coca Cola 600ml',
      'Add bacon',
    ]);
  });
});
