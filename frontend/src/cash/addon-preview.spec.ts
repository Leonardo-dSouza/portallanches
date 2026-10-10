import { BACON, COCA, OVO, X_SALADA } from '../test-support/order-menu';
import { parseItemCommand } from './item-command';
import { previewOf } from './item-preview';
import { addLine, type DraftLine } from './order-lines';

const MENU = [X_SALADA, COCA, BACON, OVO];
/** Prévia com a última linha dada (sem linha = `undefined`). */
const previewOn = (text: string, last: DraftLine | undefined) =>
  previewOf(parseItemCommand(text), MENU, 0, last);
const preview = (text: string) =>
  previewOn(text, addLine([], X_SALADA, 1).at(-1));

describe('previewOf: adicional e observação', () => {
  it('"+bac" lista os adicionais aceitos pela última linha', () => {
    const shown = preview('+bac');
    expect(shown).toMatchObject({ kind: 'addons', items: [BACON], active: 0 });
  });

  it('sem linha, ou linha que não aceita adicionais, avisa', () => {
    expect(previewOn('+bac', undefined)).toMatchObject({
      kind: 'problem',
      message: 'Lance o lanche antes do adicional',
    });
    expect(previewOn('+bac', addLine([], COCA, 1).at(-1))).toMatchObject({
      kind: 'problem',
      message: '"Coca Cola 600ml" não aceita adicionais',
    });
  });

  it('adicional que não existe para o item avisa', () => {
    expect(preview('+granola')).toMatchObject({
      kind: 'problem',
      message: 'Nenhum adicional com "granola" para "X Salada"',
    });
  });

  it('"/sem tomate" vai para a observação da última linha', () => {
    expect(preview('/sem tomate')).toMatchObject({
      kind: 'note',
      note: 'sem tomate',
    });
    expect(previewOn('/x', undefined)).toMatchObject({ kind: 'problem' });
  });
});
