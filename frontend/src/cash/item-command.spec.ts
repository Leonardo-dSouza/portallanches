import { parseItemCommand } from './item-command';

describe('parseItemCommand', () => {
  it.each([
    ['', { kind: 'empty' }],
    ['   ', { kind: 'empty' }],
    ['+', { kind: 'adjust', delta: 1 }],
    ['-', { kind: 'adjust', delta: -1 }],
    ['9', { kind: 'number', number: 9, artisanal: false, quantity: 1 }],
    ['9.', { kind: 'number', number: 9, artisanal: true, quantity: 1 }],
    ['9,', { kind: 'number', number: 9, artisanal: true, quantity: 1 }],
    ['2*9', { kind: 'number', number: 9, artisanal: false, quantity: 2 }],
    ['3x27.', { kind: 'number', number: 27, artisanal: true, quantity: 3 }],
    [' 2 * 9 ', { kind: 'number', number: 9, artisanal: false, quantity: 2 }],
    ['coca', { kind: 'search', query: 'coca', quantity: 1 }],
    ['2*coca 600', { kind: 'search', query: 'coca 600', quantity: 2 }],
    ['x sal', { kind: 'search', query: 'x sal', quantity: 1 }],
    ['açaí 5', { kind: 'search', query: 'açaí 5', quantity: 1 }],
    ['+bacon', { kind: 'addon', query: 'bacon' }],
    ['+ add ovo', { kind: 'addon', query: 'add ovo' }],
    ['/sem tomate', { kind: 'note', note: 'sem tomate' }],
    ['/', { kind: 'note', note: '' }],
  ])('"%s"', (text, expected) => {
    expect(parseItemCommand(text)).toEqual(expected);
  });

  it.each(['0*9', '100*9', '9..', '*9', '2*', '+2'])(
    '"%s" é inválido e cita o formato',
    (text) => {
      const command = parseItemCommand(text);
      expect(command).toMatchObject({ kind: 'invalid' });
      if (command.kind === 'invalid')
        expect(command.error).toContain(`"${text.trim()}"`);
    },
  );
});

describe('parseItemCommand: observação longa', () => {
  it('observação acima de 120 caracteres é inválida', () => {
    expect(parseItemCommand(`/${'x'.repeat(121)}`)).toMatchObject({
      kind: 'invalid',
    });
  });
});

describe('parseItemCommand: quantidade do campo Qtd', () => {
  it('sem "*" no Item, vale a quantidade do Qtd; com "*", vale a do Item', () => {
    expect(parseItemCommand('9', 3)).toMatchObject({ number: 9, quantity: 3 });
    expect(parseItemCommand('coca', 2)).toMatchObject({
      kind: 'search',
      quantity: 2,
    });
    expect(parseItemCommand('2*9', 5)).toMatchObject({ quantity: 2 });
  });
});
