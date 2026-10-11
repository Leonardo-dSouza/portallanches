import {
  BadRequestException,
  UnprocessableEntityException,
} from '@nestjs/common';
import {
  assertCompleteOrder,
  parseBoolean,
  parseChoice,
  parseId,
  parseIdOrder,
  parseNonNegativeInt,
  parseObject,
  parseText,
} from './input-parsers.js';

describe('input-parsers', () => {
  it('parseObject rejeita null, texto e array', () => {
    for (const body of [null, 'x', []]) {
      expect(() => parseObject(body, 'teste')).toThrow(BadRequestException);
    }
    expect(parseObject({ a: 1 }, 'teste')).toEqual({ a: 1 });
  });

  it('parseId aceita inteiro positivo e cita campo e valor ao rejeitar', () => {
    expect(parseId(3, 'id')).toBe(3);
    expect(() => parseId('3', 'id')).toThrow(/"id".*"3"/);
    expect(() => parseId(0, 'id')).toThrow(BadRequestException);
  });

  it('parseNonNegativeInt aceita zero e rejeita negativo e fração', () => {
    expect(parseNonNegativeInt(0, 'n')).toBe(0);
    expect(() => parseNonNegativeInt(-1, 'n')).toThrow(BadRequestException);
    expect(() => parseNonNegativeInt(1.5, 'n')).toThrow(BadRequestException);
  });

  it('parseText apara e valida o tamanho', () => {
    expect(parseText('  PIX ', 'name', 10)).toBe('PIX');
    expect(() => parseText('   ', 'name', 10)).toThrow(BadRequestException);
    expect(() => parseText('x'.repeat(11), 'name', 10)).toThrow(/1 a 10/);
  });

  it('parseBoolean só aceita booleano de verdade', () => {
    expect(parseBoolean(false, 'active')).toBe(false);
    expect(() => parseBoolean('true', 'active')).toThrow(BadRequestException);
  });

  it('parseChoice lista as opções na mensagem', () => {
    expect(parseChoice('ADMIN', 'role', ['ADMIN', 'CAIXA'])).toBe('ADMIN');
    expect(() => parseChoice('X', 'role', ['ADMIN', 'CAIXA'])).toThrow(
      /"ADMIN" ou "CAIXA"/,
    );
  });
});

describe('parseIdOrder', () => {
  it('a lista de ids na ordem nova', () => {
    expect(parseIdOrder({ ids: [3, 1, 2] }, 'forma de pagamento')).toEqual([
      3, 1, 2,
    ]);
  });

  it('recusa lista vazia, id inválido e id repetido citando o valor', () => {
    expect(() => parseIdOrder({ ids: [] }, 'categoria')).toThrow(
      /esperado lista não vazia de ids de categoria/,
    );
    expect(() => parseIdOrder({ ids: [1, 'x'] }, 'categoria')).toThrow(
      /ids\[1\]/,
    );
    expect(() => parseIdOrder({ ids: [1, 2, 1] }, 'categoria')).toThrow(
      /id repetido: 1; esperado cada categoria uma vez/,
    );
  });
});

describe('assertCompleteOrder', () => {
  it('aceita a mesma lista em outra ordem', () => {
    expect(() => assertCompleteOrder([3, 1, 2], [1, 2, 3])).not.toThrow();
  });

  it('recusa faltando ou sobrando id, com os dois conjuntos na mensagem', () => {
    expect(() => assertCompleteOrder([1, 2], [1, 2, 3])).toThrow(
      UnprocessableEntityException,
    );
    expect(() => assertCompleteOrder([1, 2, 9], [1, 2, 3])).toThrow(
      'Ordem com ids 1, 2, 9: esperado exatamente os ids 1, 2, 3',
    );
  });
});
