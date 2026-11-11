import { describe, expect, it } from 'vitest';
import { itemsChangeText } from './order-items-diff';

describe('itemsChangeText', () => {
  it('item novo: só ele, com "entrou"', () => {
    expect(
      itemsChangeText(
        '1× Hot Bacon, 1× X Salada (Pão Gergelim)',
        '1× Hot Bacon, 1× X Salada (Pão Gergelim), 1× Coca Cola 600ml',
      ),
    ).toBe('entrou 1× Coca Cola 600ml');
  });

  it('item tirado e quantidade mudada', () => {
    expect(itemsChangeText('2× X Salada, 1× Hot Bacon', '3× X Salada')).toBe(
      'X Salada 2× → 3× · saiu 1× Hot Bacon',
    );
  });

  it('adicional mexido: o lanche de antes sai e o novo entra (vírgula dentro do parêntese)', () => {
    expect(
      itemsChangeText(
        '1× X Salada (+1 Add bacon, sem tomate)',
        '1× X Salada (+2 Add bacon, sem tomate)',
      ),
    ).toBe(
      'entrou 1× X Salada (+2 Add bacon, sem tomate) · saiu 1× X Salada (+1 Add bacon, sem tomate)',
    );
  });

  it('a mesma linha repetida soma a quantidade', () => {
    expect(itemsChangeText('1× Coca, 1× Coca', '2× Coca')).toBeNull();
  });

  it('itens iguais: nada a dizer', () => {
    expect(itemsChangeText('1× Hot Bacon', '1× Hot Bacon')).toBeNull();
  });

  it('texto que não dá para ler (parêntese aberto na observação): antes → depois inteiro', () => {
    expect(itemsChangeText('1× X Salada (bem (passado', '2× X Salada')).toBe(
      '1× X Salada (bem (passado → 2× X Salada',
    );
  });
});
