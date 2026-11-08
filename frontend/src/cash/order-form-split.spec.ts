import { describe, expect, it } from 'vitest';
import type { PaymentMethod } from '../api/types';
import { FIADO_METHOD } from '../test-support/fake-fiado';
import { orderFixture } from '../test-support/order-fixture';
import {
  addedCents,
  addOnProblem,
  asksAddOnPayment,
  initialAddOnChoice,
  withAddOnParts,
} from './order-form-split';
import { EMPTY_ORDER_FORM } from './order-form-values';

const method = (
  id: number,
  name: string,
  extra: Partial<PaymentMethod> = {},
) => ({
  id,
  name,
  active: true,
  sortOrder: id,
  isCardTerminal: false,
  isCash: false,
  isFiado: false,
  ...extra,
});
const METHODS: PaymentMethod[] = [
  method(1, 'Dinheiro', { isCash: true }),
  method(2, 'PIX'),
  method(3, 'Ton', { isCardTerminal: true }),
  FIADO_METHOD,
];

// PIX 20 + Ton débito 30: o pedido dividido do + Item (card 2).
const DIVIDIDO = orderFixture({
  amount: '50.00',
  paymentMethodId: 2,
  paymentParts: [
    { paymentMethodId: 2, paymentMode: null, amount: '20.00' },
    { paymentMethodId: 3, paymentMode: 'DEBIT', amount: '30.00' },
  ],
});
const UMA_FORMA = orderFixture({ amount: '50.00' });

describe('initialAddOnChoice', () => {
  it('começa na forma e no meio da última parte (o Enter aceita)', () => {
    expect(initialAddOnChoice(DIVIDIDO)).toEqual({
      methodId: '3',
      mode: 'DEBIT',
    });
  });

  it('fora do dividido não há forma inicial', () => {
    expect(initialAddOnChoice(UMA_FORMA)).toEqual({ methodId: '', mode: '' });
    expect(initialAddOnChoice(null)).toEqual({ methodId: '', mode: '' });
  });
});

describe('addedCents e asksAddOnPayment', () => {
  it('o acréscimo é o total novo menos o salvo, nunca negativo', () => {
    expect(addedCents(DIVIDIDO, 5760)).toBe(760);
    expect(addedCents(DIVIDIDO, 4000)).toBe(0);
    expect(addedCents(null, 5760)).toBe(0);
  });

  it('só o dividido com acréscimo pergunta a forma', () => {
    expect(asksAddOnPayment(DIVIDIDO, 760)).toBe(true);
    expect(asksAddOnPayment(DIVIDIDO, 0)).toBe(false);
    expect(asksAddOnPayment(UMA_FORMA, 760)).toBe(false);
  });
});

describe('addOnProblem', () => {
  it('sem forma, com fiado ou maquininha sem meio, avisa', () => {
    const ask = (methodId: string, mode: '' | 'CREDIT' = '') =>
      addOnProblem(DIVIDIDO, 760, { methodId, mode }, METHODS);
    expect(ask('')).toBe('Escolha a forma em que o acréscimo foi pago');
    expect(ask(String(FIADO_METHOD.id))).toBe(
      'Fiado não divide: escolha outra forma para o acréscimo',
    );
    expect(ask('3')).toContain('Escolha crédito, débito ou PIX na Ton');
    expect(ask('3', 'CREDIT')).toBeNull();
  });

  it('pedido de uma forma não pergunta, então nunca tem problema', () => {
    expect(
      addOnProblem(UMA_FORMA, 760, { methodId: '', mode: '' }, METHODS),
    ).toBeNull();
  });
});

describe('withAddOnParts', () => {
  it('soma na parte de mesma forma e meio', () => {
    const values = { ...EMPTY_ORDER_FORM };
    const next = withAddOnParts(values, DIVIDIDO, 760, {
      methodId: '3',
      mode: 'DEBIT',
    });
    expect(next.splitParts).toEqual([
      { paymentMethodId: '2', paymentMode: '', amount: '20,00' },
      { paymentMethodId: '3', paymentMode: 'DEBIT', amount: '37,60' },
    ]);
  });

  it('forma nova vira parte no fim; sem pergunta, nada muda', () => {
    const values = { ...EMPTY_ORDER_FORM };
    const next = withAddOnParts(values, DIVIDIDO, 760, {
      methodId: '1',
      mode: '',
    });
    expect(next.splitParts.at(-1)).toEqual({
      paymentMethodId: '1',
      paymentMode: '',
      amount: '7,60',
    });
    expect(
      withAddOnParts(values, UMA_FORMA, 760, { methodId: '1', mode: '' }),
    ).toBe(values);
  });
});
