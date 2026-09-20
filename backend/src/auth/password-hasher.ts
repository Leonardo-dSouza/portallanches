import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

const KEY_LENGTH_BYTES = 64;
const SALT_LENGTH_BYTES = 16;

/**
 * Gera o hash `salt:chave` (hex) de uma senha, usando scrypt do Node
 * para não depender de lib nativa de terceiros.
 *
 * @example hashPassword('caixa123') // '9f2c…:ab41…'
 */
export function hashPassword(plainPassword: string): string {
  const salt = randomBytes(SALT_LENGTH_BYTES);
  const key = scryptSync(plainPassword, salt, KEY_LENGTH_BYTES);
  return `${salt.toString('hex')}:${key.toString('hex')}`;
}

/**
 * Confere uma senha contra um hash gerado por `hashPassword`.
 * Hash fora do formato `salt:chave` é tratado como senha incorreta.
 *
 * @example verifyPassword('caixa123', storedHash) // true
 */
export function verifyPassword(
  plainPassword: string,
  storedHash: string,
): boolean {
  const [saltHex, keyHex] = storedHash.split(':');
  if (!saltHex || !keyHex) return false;
  const expectedKey = Buffer.from(keyHex, 'hex');
  const actualKey = scryptSync(
    plainPassword,
    Buffer.from(saltHex, 'hex'),
    expectedKey.length,
  );
  return timingSafeEqual(actualKey, expectedKey);
}
