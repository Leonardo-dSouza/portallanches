import { quantityKeyAction } from './quantity-keys';

const press = (key: string, quantity: string, code = '', ctrlKey = false) =>
  quantityKeyAction({ key, code, ctrlKey }, quantity);

describe('quantityKeyAction', () => {
  it('algarismos ficam no Qtd; Enter e "*" passam para o Item', () => {
    expect(press('2', '')).toBeNull();
    expect(press('Enter', '2')).toEqual({ kind: 'toItem' });
    expect(press('*', '2')).toEqual({ kind: 'toItem' });
  });

  it('Ctrl+Enter, F2 e as outras teclas de controle ficam com a comanda', () => {
    expect(press('Enter', '2', '', true)).toBeNull();
    expect(press('F2', '')).toBeNull();
    expect(press('Backspace', '2')).toBeNull();
  });

  it('letra, "+" e "/" vão para o Item, e a quantidade fica', () => {
    expect(press('c', '2')).toEqual({
      kind: 'forward',
      itemText: 'c',
      quantity: '2',
    });
    expect(press('+', '')).toEqual({
      kind: 'forward',
      itemText: '+',
      quantity: '',
    });
  });

  it('ponto ou vírgula depois do número é o artesanal: "9." vai inteiro para o Item', () => {
    expect(press('.', '9')).toEqual({
      kind: 'forward',
      itemText: '9.',
      quantity: '',
    });
    expect(press(',', '12')).toEqual({
      kind: 'forward',
      itemText: '12.',
      quantity: '',
    });
  });

  it('"+"/"-" do bloco numérico com o Qtd vazio mexem na última linha; com número, nada', () => {
    expect(press('+', '', 'NumpadAdd')).toEqual({ kind: 'adjust', delta: 1 });
    expect(press('-', '', 'NumpadSubtract')).toEqual({
      kind: 'adjust',
      delta: -1,
    });
    expect(press('+', '3', 'NumpadAdd')).toEqual({ kind: 'block' });
  });
});
