import { parseItemCommand } from './item-command';
import { chosenItem, previewOf } from './item-preview';
import type { MenuItem } from './menu-lookup';

const item = (
  id: number,
  name: string,
  categoryName: string,
  menuNumber: number | null,
): MenuItem => ({
  id,
  name,
  categoryName,
  menuNumber,
  salePrice: '10.00',
  stockLeft: null,
});

const MENU = [
  item(1, 'X Salada', 'Tradicional', 9),
  item(2, 'X Salada', 'Artesanal', 9),
  item(5, 'Coca Cola 600ml', 'Refrigerantes', null),
  item(6, 'Coca Cola 2l', 'Refrigerantes', null),
];
const preview = (text: string, active = 0) =>
  previewOf(parseItemCommand(text), MENU, active);

describe('previewOf', () => {
  it('número mostra o item que o Enter vai pôr, com a quantidade', () => {
    expect(preview('2*9.')).toEqual({
      kind: 'item',
      item: MENU[1],
      quantity: 2,
    });
  });

  it('busca lista os itens e marca o escolhido pelas setas', () => {
    expect(preview('coca', 1)).toEqual({
      kind: 'results',
      items: [MENU[3], MENU[2]],
      active: 1,
      quantity: 1,
    });
  });

  it('a seta não passa do fim nem do começo da lista', () => {
    expect(preview('coca', 7)).toMatchObject({ active: 1 });
    expect(preview('coca', -3)).toMatchObject({ active: 0 });
  });

  it('número fora do cardápio, busca sem resultado e texto inválido viram aviso', () => {
    expect(preview('99')).toEqual({
      kind: 'problem',
      message: 'O 99 não está no cardápio (ou está sem preço)',
    });
    expect(preview('cox')).toEqual({
      kind: 'problem',
      message: 'Nenhum item com "cox"',
    });
    expect(preview('0*9')).toMatchObject({ kind: 'problem' });
  });

  it('vazio e "+"/"-" não mostram item', () => {
    expect(preview('')).toEqual({ kind: 'idle' });
    expect(preview('+')).toEqual({ kind: 'adjust', delta: 1 });
  });
});

describe('chosenItem', () => {
  it('é o item do número ou o marcado na busca', () => {
    expect(chosenItem(preview('9'))?.id).toBe(1);
    expect(chosenItem(preview('coca', 1))?.id).toBe(5);
    expect(chosenItem(preview('99'))).toBeNull();
  });
});
