import { describe, expect, it } from 'vitest';
import type { PaymentKeyLayout, PaymentMethod } from '../api/types';
import {
  layoutFromKeyOrder,
  moveKeyEntry,
  numberedPaymentKeys,
  paymentKeyOrder,
  type PaymentKeyEntry,
} from './payment-key-row';

const method = (
  id: number,
  name: string,
  sortOrder: number,
  active = true,
): PaymentMethod => ({
  id,
  name,
  active,
  sortOrder,
  isCardTerminal: false,
  isCash: false,
  isFiado: false,
});

const DINHEIRO = method(1, 'Dinheiro', 0);
const PIX = method(2, 'PIX', 1);
const TON = method(3, 'Ton', 2);
const VELHA = method(4, 'Velha', 3, false);
const METHODS = [TON, DINHEIRO, VELHA, PIX];

const layout = (
  open: number,
  split: number,
  openActive = true,
  splitActive = true,
): PaymentKeyLayout => ({
  openAccount: { position: open, active: openActive },
  split: { position: split, active: splitActive },
});

const names = (entries: PaymentKeyEntry[]) =>
  entries.map((e) => (e.kind === 'method' ? e.method.name : e.kind));

describe('paymentKeyOrder', () => {
  it('padrão (98 e 99): as formas na ordem do cadastro e as duas especiais no fim', () => {
    expect(names(paymentKeyOrder(METHODS, layout(98, 99)))).toEqual([
      'Dinheiro',
      'PIX',
      'Ton',
      'Velha',
      'openAccount',
      'split',
    ]);
  });

  it('a posição conta as inativas, como a lista de Cadastros', () => {
    expect(names(paymentKeyOrder(METHODS, layout(4, 2)))).toEqual([
      'Dinheiro',
      'PIX',
      'split',
      'Ton',
      'openAccount',
      'Velha',
    ]);
  });
});

describe('numberedPaymentKeys', () => {
  it('número fixo pela posição entre as ativas; a inativa e a desligada somem', () => {
    const keys = numberedPaymentKeys(METHODS, layout(4, 2, false));
    expect(keys.map((k) => [names([k])[0], k.number])).toEqual([
      ['Dinheiro', 1],
      ['PIX', 2],
      ['split', 3],
      ['Ton', 4],
    ]);
  });

  it('a especial ligada guarda o número mesmo onde a tela não a mostra', () => {
    const keys = numberedPaymentKeys(METHODS, layout(1, 99));
    expect(keys.map((k) => [names([k])[0], k.number])).toEqual([
      ['Dinheiro', 1],
      ['openAccount', 2],
      ['PIX', 3],
      ['Ton', 4],
      ['split', 5],
    ]);
  });
});

describe('moveKeyEntry e layoutFromKeyOrder', () => {
  it('subir o Dividir troca com a forma de cima e grava ids e posições', () => {
    const order = paymentKeyOrder(METHODS, layout(98, 99));
    const moved = moveKeyEntry(order, 5, -1);
    expect(names(moved!)).toEqual([
      'Dinheiro',
      'PIX',
      'Ton',
      'Velha',
      'split',
      'openAccount',
    ]);
    expect(layoutFromKeyOrder(moved!, layout(98, 99, true, false))).toEqual({
      ids: [1, 2, 3, 4],
      layout: layout(5, 4, true, false),
    });
  });

  it('mover para fora da lista não faz nada', () => {
    const order = paymentKeyOrder(METHODS, layout(98, 99));
    expect(moveKeyEntry(order, 0, -1)).toBeNull();
    expect(moveKeyEntry(order, 5, 1)).toBeNull();
  });
});
