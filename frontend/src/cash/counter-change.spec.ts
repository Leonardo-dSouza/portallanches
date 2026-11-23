import { counterChangeOf } from './counter-change';

describe('counterChangeOf', () => {
  it('troco do que o cliente deu menos o total', () => {
    expect(counterChangeOf('50', 1780)).toEqual({
      text: 'Troco R$ 32,20',
      short: false,
    });
  });

  it('aceita vírgula e valor exato dá troco zero', () => {
    expect(counterChangeOf('17,80', 1780)).toEqual({
      text: 'Troco R$ 0,00',
      short: false,
    });
  });

  it('recebido menor que o total diz quanto falta', () => {
    expect(counterChangeOf('10', 1780)).toEqual({
      text: 'Faltam R$ 7,80',
      short: true,
    });
  });

  it('vazio ou inválido não mostra nada', () => {
    expect(counterChangeOf('', 1780)).toBeNull();
    expect(counterChangeOf('abc', 1780)).toBeNull();
  });
});
