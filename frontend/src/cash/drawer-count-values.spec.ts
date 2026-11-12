import { describe, expect, it } from 'vitest';
import type { DrawerToCount } from '../api/types';
import { buildDrawerCount, drawerCountFieldLabel } from './drawer-count-values';

const TO_COUNT: DrawerToCount[] = [
  { paymentMethodId: 1, name: 'Dinheiro', isCash: true },
  { paymentMethodId: 2, name: 'PIX', isCash: false },
  { paymentMethodId: 3, name: 'Cartão Ton', isCash: false },
];

describe('drawerCountFieldLabel', () => {
  it('acrescenta lembrete do troco inicial na forma de dinheiro', () => {
    expect(
      drawerCountFieldLabel({
        paymentMethodId: 1,
        name: 'Dinheiro',
        isCash: true,
      }),
    ).toBe('Dinheiro (com o troco inicial)');
  });

  it('mantém o nome original nas outras formas', () => {
    expect(
      drawerCountFieldLabel({ paymentMethodId: 2, name: 'PIX', isCash: false }),
    ).toBe('PIX');
  });
});

describe('buildDrawerCount', () => {
  it('aponta qual forma falta quando o campo está vazio ou omitido', () => {
    const emptyValues = { 1: '30,00' };
    const result = buildDrawerCount(TO_COUNT, emptyValues, '');
    expect(result).toEqual({
      ok: false,
      error: 'Falta a contagem de: PIX',
    });
  });

  it('aponta qual forma falta quando o campo só tem espaços', () => {
    const whitespaceValues = { 1: '   ', 2: '50,00', 3: '10,00' };
    const result = buildDrawerCount(TO_COUNT, whitespaceValues, '');
    expect(result).toEqual({
      ok: false,
      error: 'Falta a contagem de: Dinheiro',
    });
  });

  it('rejeita valor mal formado dizendo a forma e o formato esperado', () => {
    const invalidValues = { 1: '30,00', 2: 'cinquenta', 3: '10,00' };
    const result = buildDrawerCount(TO_COUNT, invalidValues, '');
    expect(result).toEqual({
      ok: false,
      error:
        'Valor inválido em PIX: recebido "cinquenta", esperado valor em reais (ex.: 12,50)',
    });
  });

  it('rejeita valor negativo', () => {
    const negativeValues = { 1: '-10,00', 2: '50,00', 3: '10,00' };
    const result = buildDrawerCount(TO_COUNT, negativeValues, '');
    expect(result).toEqual({
      ok: false,
      error:
        'Valor inválido em Dinheiro: recebido "-10,00", esperado valor em reais (ex.: 12,50)',
    });
  });

  it('rejeita observação que passa de 500 caracteres', () => {
    const validValues = { 1: '30,00', 2: '50,00', 3: '10,00' };
    const result = buildDrawerCount(TO_COUNT, validValues, 'a'.repeat(501));
    expect(result).toEqual({
      ok: false,
      error: 'A observação passa de 500 caracteres: recebido 501',
    });
  });

  it('monta o corpo no formato da API na ordem de toCount com nota nula quando vazia', () => {
    const validValues = { 1: '30', 2: '50,5', 3: '0' };
    const result = buildDrawerCount(TO_COUNT, validValues, '   ');
    expect(result).toEqual({
      ok: true,
      count: {
        counts: [
          { paymentMethodId: 1, amount: '30.00' },
          { paymentMethodId: 2, amount: '50.50' },
          { paymentMethodId: 3, amount: '0.00' },
        ],
        note: null,
      },
    });
  });

  it('monta o corpo preservando a observação com trim', () => {
    const validValues = { 1: '30,00', 2: '50,00', 3: '10,00' };
    const result = buildDrawerCount(
      TO_COUNT,
      validValues,
      '  Tirei R$ 15 para gasolina  ',
    );
    expect(result).toEqual({
      ok: true,
      count: {
        counts: [
          { paymentMethodId: 1, amount: '30.00' },
          { paymentMethodId: 2, amount: '50.00' },
          { paymentMethodId: 3, amount: '10.00' },
        ],
        note: 'Tirei R$ 15 para gasolina',
      },
    });
  });
});
