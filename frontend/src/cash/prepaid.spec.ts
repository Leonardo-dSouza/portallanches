import { describe, expect, it } from 'vitest';
import type { PaymentMethod } from '../api/types';
import { OPEN_ACCOUNT, SPLIT } from './payment-choice';
import { prepaidAllowed, prepaidByDefault } from './prepaid';

const PIX: PaymentMethod = {
  id: 1,
  name: 'PIX',
  active: true,
  sortOrder: 1,
  isCardTerminal: false,
  isCash: false,
  isFiado: false,
  isIfood: false,
};

const DINHEIRO: PaymentMethod = {
  id: 2,
  name: 'Dinheiro',
  active: true,
  sortOrder: 2,
  isCardTerminal: false,
  isCash: true,
  isFiado: false,
  isIfood: false,
};

const CARTAO_TON: PaymentMethod = {
  id: 3,
  name: 'Cartão Ton',
  active: true,
  sortOrder: 3,
  isCardTerminal: true,
  isCash: false,
  isFiado: false,
  isIfood: false,
};

const FIADO: PaymentMethod = {
  id: 4,
  name: 'Fiado',
  active: true,
  sortOrder: 4,
  isCardTerminal: false,
  isCash: false,
  isFiado: true,
  isIfood: false,
};

const METHODS = [PIX, DINHEIRO, CARTAO_TON, FIADO];

describe('prepaidByDefault', () => {
  it('PIX liga o PAGO por padrão', () => {
    expect(prepaidByDefault('1', METHODS)).toBe(true);
  });

  it('Dinheiro, Cartão Ton e Fiado nascem com PAGO desligado', () => {
    expect(prepaidByDefault('2', METHODS)).toBe(false);
    expect(prepaidByDefault('3', METHODS)).toBe(false);
    expect(prepaidByDefault('4', METHODS)).toBe(false);
  });

  it('sem forma, A pagar e Dividir nascem desligados', () => {
    expect(prepaidByDefault('', METHODS)).toBe(false);
    expect(prepaidByDefault(OPEN_ACCOUNT, METHODS)).toBe(false);
    expect(prepaidByDefault(SPLIT, METHODS)).toBe(false);
  });
});

describe('prepaidAllowed', () => {
  it('entrega com PIX, Dinheiro ou Cartão permite PAGO', () => {
    expect(
      prepaidAllowed({ type: 'DELIVERY', paymentMethodId: '1' }, METHODS),
    ).toBe(true);
    expect(
      prepaidAllowed({ type: 'DELIVERY', paymentMethodId: '2' }, METHODS),
    ).toBe(true);
    expect(
      prepaidAllowed({ type: 'DELIVERY', paymentMethodId: '3' }, METHODS),
    ).toBe(true);
  });

  it('balcão não permite PAGO', () => {
    expect(
      prepaidAllowed({ type: 'COUNTER', paymentMethodId: '1' }, METHODS),
    ).toBe(false);
  });

  it('fiado na entrega não permite PAGO', () => {
    expect(
      prepaidAllowed({ type: 'DELIVERY', paymentMethodId: '4' }, METHODS),
    ).toBe(false);
  });

  it('Dividir na entrega não permite PAGO', () => {
    expect(
      prepaidAllowed({ type: 'DELIVERY', paymentMethodId: SPLIT }, METHODS),
    ).toBe(false);
  });

  it('sem forma na entrega não permite PAGO', () => {
    expect(
      prepaidAllowed({ type: 'DELIVERY', paymentMethodId: '' }, METHODS),
    ).toBe(false);
  });
});
