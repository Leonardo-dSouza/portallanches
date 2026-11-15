import { describe, expect, it } from 'vitest';
import {
  cleanPinDigits,
  managerPinSituation,
  parseManagerPin,
} from './manager-pin-values';

describe('manager-pin-values', () => {
  it('cleanPinDigits limpa caracteres não numéricos e limita em 6 dígitos', () => {
    expect(cleanPinDigits('12a3-4b5c6d7e')).toBe('123456');
    expect(cleanPinDigits('abc')).toBe('');
  });

  it('managerPinSituation devolve a frase correspondente', () => {
    expect(managerPinSituation(true)).toBe('Cadastrado.');
    expect(managerPinSituation(false)).toBe(
      'Ainda não cadastrado: a trava do caixa não libera nada até você cadastrar.',
    );
  });

  it('parseManagerPin valida 6 dígitos e campos idênticos sem expor código', () => {
    expect(parseManagerPin('123', '123')).toEqual({
      ok: false,
      error: 'Código novo precisa ter 6 números',
    });
    expect(parseManagerPin('135790', '135791')).toEqual({
      ok: false,
      error: 'Os dois códigos não batem: digite o mesmo nos dois campos',
    });
    expect(parseManagerPin('135790', '135790')).toEqual({
      ok: true,
      value: '135790',
    });
  });
});
