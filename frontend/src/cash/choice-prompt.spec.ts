import {
  BREAD_MENU,
  PAO_GERGELIM,
  X_SALADA,
  X_SALADA_ART,
} from '../test-support/order-menu';
import {
  choicePreview,
  lineToAsk,
  pendingChoiceMessage,
} from './choice-prompt';
import { setChoice } from './line-choice';
import { addLine } from './order-lines';

describe('choicePreview', () => {
  const [line] = addLine([], X_SALADA_ART, 1);

  it('pergunta o pão com as opções em ordem e a marcada dentro da lista', () => {
    const preview = choicePreview(BREAD_MENU, line, 9);
    expect(preview?.options.map((o) => o.name)).toEqual([
      'Pão Gergelim',
      'Pão Brioche',
      'Pão Tradicional',
    ]);
    expect(preview?.active).toBe(2);
    expect(preview?.subject).toBe('o pão');
  });

  it('nada a perguntar sem linha, com o pão escolhido ou num item sem escolha', () => {
    const [chosen] = setChoice([line], line.id, PAO_GERGELIM);
    const [plain] = addLine([], X_SALADA, 1);
    expect(choicePreview(BREAD_MENU, undefined, 0)).toBeNull();
    expect(choicePreview(BREAD_MENU, chosen, 0)).toBeNull();
    expect(choicePreview(BREAD_MENU, plain, 0)).toBeNull();
  });
});

describe('lineToAsk', () => {
  it('a linha nova do artesanal abre a pergunta; o tradicional, não', () => {
    const before = addLine([], X_SALADA, 1);
    expect(
      lineToAsk(before, addLine(before, X_SALADA_ART, 1), BREAD_MENU)?.id,
    ).toBe(2);
    expect(
      lineToAsk(before, addLine(before, X_SALADA, 1), BREAD_MENU),
    ).toBeUndefined();
  });

  it('sem linha nova (adicional, observação) não pergunta', () => {
    const lines = addLine([], X_SALADA_ART, 1);
    expect(lineToAsk(lines, lines, BREAD_MENU)).toBeUndefined();
  });
});

describe('pendingChoiceMessage', () => {
  it('diz o que falta e de qual lanche', () => {
    expect(pendingChoiceMessage('o pão', 'X Salada')).toBe(
      'Escolha o pão do X Salada antes de seguir',
    );
  });
});
