import { BadRequestException } from '@nestjs/common';
import { parseNewUserInput, parseUserChangesInput } from './users-input.js';

const VALID = {
  name: 'Ana',
  username: 'ana.silva',
  password: 'cebola-roxa',
  role: 'CAIXA',
};

describe('users-input', () => {
  it('aceita usuário novo válido', () => {
    expect(parseNewUserInput(VALID)).toEqual(VALID);
  });

  it.each([
    { ...VALID, username: 'Ana Silva' },
    { ...VALID, username: 'ab' },
    { ...VALID, role: 'GERENTE' },
    { ...VALID, password: '123' },
    { ...VALID, name: '' },
  ])('rejeita usuário novo inválido %j', (body) => {
    expect(() => parseNewUserInput(body)).toThrow(BadRequestException);
  });

  it('senha nova: 8 para CAIXA, 10 para ADMIN (S-18)', () => {
    expect(() =>
      parseNewUserInput({ ...VALID, password: 'cebola-7' }),
    ).not.toThrow();
    expect(() =>
      parseNewUserInput({ ...VALID, password: 'cebola-7', role: 'ADMIN' }),
    ).toThrow(/10 a 128 caracteres para ADMIN/);
  });

  it.each(['123456', 'admin123', 'Caixa123', '1234567890', 'ana.silva'])(
    'recusa a senha óbvia %j',
    (password) => {
      expect(() => parseNewUserInput({ ...VALID, password })).toThrow(
        BadRequestException,
      );
    },
  );

  it('recusa senha acima de 128', () => {
    expect(() =>
      parseNewUserInput({ ...VALID, password: 'x'.repeat(129) }),
    ).toThrow(/8 a 128/);
  });

  it('não ecoa a senha na mensagem de erro', () => {
    for (const password of ['123', 'senha123']) {
      const error = (() => {
        try {
          parseNewUserInput({ ...VALID, password });
        } catch (caught) {
          return caught as Error;
        }
      })();
      expect(error?.message).not.toContain(password);
    }
  });

  it('aceita alterações válidas e exige active', () => {
    expect(
      parseUserChangesInput({ name: 'Ana', role: 'ADMIN', active: false }),
    ).toEqual({
      name: 'Ana',
      role: 'ADMIN',
      active: false,
    });
    expect(() => parseUserChangesInput({ name: 'Ana', role: 'ADMIN' })).toThrow(
      /"active"/,
    );
  });
});
