import { ApiError } from '../api/api-client';
import { catalogErrorMessage } from './catalog-errors';
import {
  feeForEditing,
  parseEffectiveFrom,
  parseEntryName,
  parseRateAmount,
  parseZoneFee,
  sortByLabel,
} from './catalog-values';

describe('parseEntryName', () => {
  it('apara espaços das pontas', () => {
    expect(parseEntryName('  Gás ', 'nome')).toEqual({
      ok: true,
      value: 'Gás',
    });
  });

  it('recusa vazio e nome longo, citando o valor recebido', () => {
    expect(parseEntryName('   ', 'nome do bairro')).toMatchObject({
      ok: false,
      error: expect.stringContaining('nome do bairro'),
    });
    expect(parseEntryName('a'.repeat(81), 'nome')).toMatchObject({
      ok: false,
      error: expect.stringContaining('81'),
    });
  });
});

describe('parseZoneFee', () => {
  it('converte para o formato da API', () => {
    expect(parseZoneFee('8,5')).toEqual({ ok: true, value: '8.50' });
  });

  it('recusa texto inválido citando o que foi digitado', () => {
    expect(parseZoneFee('R$ 8')).toMatchObject({
      ok: false,
      error: expect.stringContaining('"R$ 8"'),
    });
  });

  it('feeForEditing troca ponto por vírgula', () => {
    expect(feeForEditing('3.00')).toBe('3,00');
  });
});

describe('sortByLabel', () => {
  it('ordena em português ignorando acento e caixa, sem alterar a lista original', () => {
    const items = ['uru', 'Ágata', 'centro', 'Bela Vista'];
    expect(sortByLabel(items, (item) => item)).toEqual([
      'Ágata',
      'Bela Vista',
      'centro',
      'uru',
    ]);
    expect(items[0]).toBe('uru');
  });
});

describe('catalogErrorMessage', () => {
  it('troca o 409 técnico por uma mensagem em português', () => {
    const message = catalogErrorMessage(
      new ApiError(409, 'expense_types_name_key_key'),
    );
    expect(message).toContain('Já existe um cadastro com esse nome');
    expect(message).not.toContain('expense_types');
  });

  it('mantém a mensagem dos outros erros', () => {
    expect(catalogErrorMessage(new ApiError(400, 'Taxa inválida'))).toBe(
      'Taxa inválida',
    );
  });
});

describe('parseRateAmount', () => {
  it('converte para o formato da API', () => {
    expect(parseRateAmount('65')).toEqual({ ok: true, value: '65.00' });
  });

  it('recusa zero, texto e mais de 2 casas, citando o valor', () => {
    for (const typed of ['0', '0,00', 'abc', '1,234']) {
      expect(parseRateAmount(typed)).toMatchObject({
        ok: false,
        error: expect.stringContaining(`"${typed}"`),
      });
    }
  });
});

describe('parseEffectiveFrom', () => {
  it('aceita dia real e recusa vazio ou inexistente', () => {
    expect(parseEffectiveFrom('2026-10-01')).toEqual({
      ok: true,
      value: '2026-10-01',
    });
    expect(parseEffectiveFrom('')).toMatchObject({ ok: false });
    expect(parseEffectiveFrom('2026-02-30')).toMatchObject({ ok: false });
  });
});
