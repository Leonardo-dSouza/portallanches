import { hashPassword, verifyPassword } from './password-hasher.js';

describe('password-hasher', () => {
  it('aceita a senha correta', async () => {
    expect(await verifyPassword('caixa123', hashPassword('caixa123'))).toBe(
      true,
    );
  });

  it('rejeita senha incorreta', async () => {
    expect(await verifyPassword('outra', hashPassword('caixa123'))).toBe(false);
  });

  it('gera hashes diferentes para a mesma senha (salt aleatório)', () => {
    expect(hashPassword('caixa123')).not.toBe(hashPassword('caixa123'));
  });

  it('trata hash malformado como senha incorreta', async () => {
    expect(await verifyPassword('caixa123', 'sem-separador')).toBe(false);
  });

  it('chave fora de hexadecimal não aceita qualquer senha (antes "00:zz" dava true)', async () => {
    for (const hash of [
      '00:zz',
      'abcd:zzzz',
      `${'0'.repeat(32)}:${'z'.repeat(128)}`,
    ])
      expect(await verifyPassword('qualquer', hash)).toBe(false);
  });

  it('chave curta ou sal curto também não valem', async () => {
    const [salt, key] = hashPassword('caixa123').split(':');
    expect(
      await verifyPassword('caixa123', `${salt}:${key.slice(0, 64)}`),
    ).toBe(false);
    expect(await verifyPassword('caixa123', `${salt.slice(0, 8)}:${key}`)).toBe(
      false,
    );
  });
});
