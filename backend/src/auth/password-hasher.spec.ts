import { hashPassword, verifyPassword } from './password-hasher.js';

describe('password-hasher', () => {
  it('aceita a senha correta', () => {
    expect(verifyPassword('caixa123', hashPassword('caixa123'))).toBe(true);
  });

  it('rejeita senha incorreta', () => {
    expect(verifyPassword('outra', hashPassword('caixa123'))).toBe(false);
  });

  it('gera hashes diferentes para a mesma senha (salt aleatório)', () => {
    expect(hashPassword('caixa123')).not.toBe(hashPassword('caixa123'));
  });

  it('trata hash malformado como senha incorreta', () => {
    expect(verifyPassword('caixa123', 'sem-separador')).toBe(false);
  });
});
