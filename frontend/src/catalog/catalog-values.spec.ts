import { ApiError } from '../api/api-client';
import { catalogErrorMessage } from './catalog-errors';
import {
  feeForEditing,
  parseEntryName,
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
