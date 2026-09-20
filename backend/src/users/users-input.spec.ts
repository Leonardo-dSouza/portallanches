import { BadRequestException } from '@nestjs/common';
import {
  parseNewUserInput,
  parsePassword,
  parseUserChangesInput,
} from './users-input.js';

const VALID = {
  name: 'Ana',
  username: 'ana.silva',
  password: 'segredo1',
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

  it('não ecoa a senha na mensagem de erro', () => {
    expect(() => parsePassword('123', 'password')).toThrow(/pelo menos 6/);
    try {
      parsePassword('123', 'password');
    } catch (error) {
      expect((error as Error).message).not.toContain('"123"');
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
