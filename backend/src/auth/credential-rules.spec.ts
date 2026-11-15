import { BadRequestException } from '@nestjs/common';
import { assertLoginShape } from './credential-rules.js';

describe('assertLoginShape', () => {
  it('aceita os nomes do cadastro e senha de até 128', () => {
    expect(() =>
      assertLoginShape('portallanches_caixa', 'x'.repeat(128)),
    ).not.toThrow();
    expect(() => assertLoginShape('ana.b-2', '')).not.toThrow();
  });

  it.each(['ab', 'Caixa', 'caixa ', 'a'.repeat(31), 'ç', ''])(
    'recusa o usuário %j com 400',
    (username) => {
      expect(() => assertLoginShape(username, 'x')).toThrow(
        BadRequestException,
      );
    },
  );

  it('a mensagem não repete o usuário recebido', () => {
    expect(() => assertLoginShape('<script>xyz', 'x')).toThrow(
      /^Usuário inválido: esperado 3 a 30 caracteres/,
    );
    expect(() => assertLoginShape('<script>xyz', 'x')).not.toThrow(/script/);
  });

  it('recusa senha com mais de 128 caracteres', () => {
    expect(() => assertLoginShape('caixa', 'x'.repeat(129))).toThrow(/até 128/);
  });
});
