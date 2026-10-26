import type { PaymentMethod } from '../api/types';
import { FIADO_METHOD } from '../test-support/fake-fiado';
import {
  buildFiadoPayment,
  receiveMethods,
  type ReceiveFiadoValues,
} from './receive-fiado-values';

const PIX: PaymentMethod = {
  id: 1,
  name: 'PIX',
  active: true,
  sortOrder: 0,
  isCardTerminal: false,
  isCash: false,
  isFiado: false,
};
const TON: PaymentMethod = {
  ...PIX,
  id: 3,
  name: 'Ton',
  isCardTerminal: true,
};
const OFF: PaymentMethod = { ...PIX, id: 4, name: 'Cheque', active: false };
const METHODS = [PIX, TON, FIADO_METHOD, OFF];

const values = (fields: Partial<ReceiveFiadoValues>): ReceiveFiadoValues => ({
  amount: '20,00',
  extra: '',
  paymentMethodId: '1',
  paymentMode: '',
  ...fields,
});

describe('receiveMethods', () => {
  it('as formas ativas, sem a fiado', () => {
    expect(receiveMethods(METHODS).map((m) => m.id)).toEqual([1, 3]);
  });
});

describe('buildFiadoPayment', () => {
  it('valor e forma; o adicional só quando digitado', () => {
    expect(buildFiadoPayment(values({}), METHODS)).toEqual({
      ok: true,
      input: { amount: '20.00', paymentMethodId: 1 },
    });
    expect(buildFiadoPayment(values({ extra: '5' }), METHODS)).toEqual({
      ok: true,
      input: { amount: '20.00', extra: '5.00', paymentMethodId: 1 },
    });
  });

  it('a maquininha leva o meio, e sem ele avisa', () => {
    const withMode = values({ paymentMethodId: '3', paymentMode: 'PIX' });
    expect(buildFiadoPayment(withMode, METHODS)).toMatchObject({
      input: { paymentMethodId: 3, paymentMode: 'PIX' },
    });
    expect(
      buildFiadoPayment(values({ paymentMethodId: '3' }), METHODS),
    ).toEqual({
      ok: false,
      error: 'Escolha crédito, débito ou PIX na Ton (teclas 1 a 3)',
    });
  });

  it('valor vazio, zero ou com letra avisa com o que foi digitado', () => {
    const missing = { ok: false, error: 'Informe quanto o cliente pagou' };
    expect(buildFiadoPayment(values({ amount: '' }), METHODS)).toEqual(missing);
    expect(buildFiadoPayment(values({ amount: '0' }), METHODS)).toEqual(
      missing,
    );
    expect(buildFiadoPayment(values({ amount: '2O' }), METHODS)).toEqual({
      ok: false,
      error: 'Valor inválido "2O": digite só números (ex.: 20,00)',
    });
    expect(buildFiadoPayment(values({ extra: 'x' }), METHODS)).toEqual({
      ok: false,
      error:
        'Adicional inválido "x": digite só números (ex.: 5,00) ou deixe vazio',
    });
  });

  it('sem forma avisa', () => {
    expect(buildFiadoPayment(values({ paymentMethodId: '' }), METHODS)).toEqual(
      {
        ok: false,
        error: 'Escolha a forma do pagamento (teclas 1 a 2)',
      },
    );
  });
});
