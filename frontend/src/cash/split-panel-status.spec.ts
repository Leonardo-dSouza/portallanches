import { describe, expect, it } from 'vitest';
import type { PaymentMethod } from '../api/types';
import { splitBalanceTone, splitPartProblems } from './split-panel-status';
import type { SplitPartDraft } from './split-payment';

const method = (
  id: number,
  name: string,
  flags: Partial<PaymentMethod> = {},
): PaymentMethod => ({
  id,
  name,
  active: true,
  sortOrder: id,
  isCardTerminal: false,
  isCash: false,
  isFiado: false,
  ...flags,
});

const METHODS = [
  method(1, 'Dinheiro', { isCash: true }),
  method(2, 'PIX'),
  method(3, 'Cartão Ton', { isCardTerminal: true }),
];

const part = (
  paymentMethodId: string,
  amount: string,
  paymentMode: SplitPartDraft['paymentMode'] = '',
): SplitPartDraft => ({ paymentMethodId, paymentMode, amount });

describe('splitBalanceTone', () => {
  it('falta, sobra ou fechou, para a cor do selo do Dividir', () => {
    expect(splitBalanceTone(5000, [part('1', '20,00')])).toBe('short');
    expect(splitBalanceTone(5000, [part('1', '60,00')])).toBe('over');
    expect(
      splitBalanceTone(5000, [part('1', '20,00'), part('2', '30,00')]),
    ).toBe('ok');
  });
});

describe('splitPartProblems', () => {
  it('linha certa não tem problema', () => {
    expect(
      splitPartProblems(
        [part('1', '20,00'), part('3', '30,00', 'DEBIT')],
        METHODS,
      ),
    ).toEqual([null, null]);
  });

  it('diz o que falta em cada linha: forma, meio da maquininha, valor', () => {
    expect(
      splitPartProblems(
        [part('', '20,00'), part('3', '30,00'), part('2', '')],
        METHODS,
      ),
    ).toEqual([
      'Escolha a forma',
      'Escolha crédito, débito ou PIX na Cartão Ton',
      'Valor zerado',
    ]);
  });

  it('o Dinheiro repetido avisa na segunda linha (ele entra numa parte só)', () => {
    expect(
      splitPartProblems([part('1', '10,00'), part('1', '5,00')], METHODS),
    ).toEqual([null, 'O Dinheiro já está noutra parte: some os valores']);
  });
});
