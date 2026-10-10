import { BACON, COCA, OVO, X_SALADA } from '../test-support/order-menu';
import { parseItemCommand } from './item-command';
import { applyEnter, applyPick } from './item-enter';
import { previewOf } from './item-preview';
import { addLine, type DraftLine } from './order-lines';

const MENU = [X_SALADA, COCA, BACON, OVO];

function enter(text: string, lines: DraftLine[]) {
  const command = parseItemCommand(text);
  return applyEnter(command, previewOf(command, MENU, 0, lines.at(-1)), lines);
}

describe('applyEnter', () => {
  it('número põe a linha; vazio segue para o pagamento', () => {
    expect(enter('9', [])).toMatchObject({ result: 'added', problem: null });
    expect(enter('', []).result).toBe('done');
  });

  it('"+bacon" põe o adicional na última linha', () => {
    const { lines } = enter('+bacon', addLine([], X_SALADA, 2));
    expect(lines[0].addons).toEqual([
      { productId: 33, name: 'Add bacon', unitPrice: '6.00', quantity: 1 },
    ]);
  });

  it('"/sem tomate" grava a observação da última linha; "/" limpa', () => {
    const noted = enter('/sem tomate', addLine([], X_SALADA, 1)).lines;
    expect(noted[0].note).toBe('sem tomate');
    expect(enter('/', noted).lines[0].note).toBe('');
  });

  it('o que não deu certo volta como aviso, sem mexer nas linhas', () => {
    const lines = addLine([], COCA, 1);
    expect(enter('+bacon', lines)).toEqual({
      result: 'problem',
      lines,
      problem: '"Coca Cola 600ml" não aceita adicionais',
    });
  });
});

describe('applyPick', () => {
  it('clique num adicional põe na última linha; num item, põe a linha', () => {
    const lines = addLine([], X_SALADA, 1);
    const addonPreview = previewOf(
      parseItemCommand('+o'),
      MENU,
      0,
      lines.at(-1),
    );
    expect(applyPick(addonPreview, OVO, lines)[0].addons[0].name).toBe(
      'Add ovo',
    );
    const itemPreview = previewOf(
      parseItemCommand('2*coca'),
      MENU,
      0,
      lines.at(-1),
    );
    expect(applyPick(itemPreview, COCA, lines).at(-1)).toMatchObject({
      productId: 5,
      quantity: 2,
    });
  });
});
