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

  it('parseText aceita texto normal com acento e símbolos comuns', () => {
    expect(parseText('  Pastel de Palmito & Açaí  ', 'name', 40)).toBe(
      'Pastel de Palmito & Açaí',
    );
    expect(parseText('X-Tudo com Café e Pão de Queijo', 'name', 40)).toBe(
      'X-Tudo com Café e Pão de Queijo',
    );
  });

  it('parseText recusa caracteres de controle Unicode (Cc), incluindo DEL e \\x00', () => {
    expect(() => parseText('Gás\x7F', 'name', 20)).toThrow(
      'Campo "name" inválido: recebido caractere de controle \\x7F, esperado texto sem caracteres de controle',
    );
    expect(() => parseText('Gás\x00', 'name', 20)).toThrow(
      'Campo "name" inválido: recebido caractere de controle \\x00, esperado texto sem caracteres de controle',
    );
    expect(() => parseText('Texto\x9F', 'name', 20)).toThrow(
      'Campo "name" inválido: recebido caractere de controle \\x9F, esperado texto sem caracteres de controle',
    );
  });

  it('parseText recusa quebra de linha e tabulação pois nenhum campo é multilinha', () => {
    expect(() => parseText('Linha 1\nLinha 2', 'description', 40)).toThrow(
      'Campo "description" inválido: recebido caractere de controle \\x0A, esperado texto sem caracteres de controle',
    );
    expect(() => parseText('Col 1\tCol 2', 'description', 40)).toThrow(
      'Campo "description" inválido: recebido caractere de controle \\x09, esperado texto sem caracteres de controle',
    );
    expect(() => parseText('Retorno\rCarro', 'description', 40)).toThrow(
      'Campo "description" inválido: recebido caractere de controle \\x0D, esperado texto sem caracteres de controle',
    );
  });

  it('parseText só apara quebra de linha e tab nas pontas (texto colado)', () => {
    expect(parseText('\tCoca lata\r\n', 'name', 20)).toBe('Coca lata');
    expect(() => parseText('Coca\x7F\n', 'name', 20)).toThrow(
      BadRequestException,
    );
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
