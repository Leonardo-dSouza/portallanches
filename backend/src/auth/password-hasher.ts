import { randomBytes, scrypt, scryptSync, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const KEY_LENGTH_BYTES = 64;
const SALT_LENGTH_BYTES = 16;
/** `salt:chave` em hex, com os tamanhos exatos que `hashPassword` grava. */
const STORED_HASH_PATTERN = new RegExp(
  `^[0-9a-f]{${SALT_LENGTH_BYTES * 2}}:[0-9a-f]{${KEY_LENGTH_BYTES * 2}}$`,
);

const scryptAsync = promisify(scrypt) as (
  password: string,
  salt: Buffer,
  keyLength: number,
) => Promise<Buffer>;

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
 * Confere uma senha contra um hash gerado por `hashPassword`. Hash fora do formato exato é senha
 * incorreta: até 2026-11-15 a chave fora de hexadecimal virava 0 bytes e qualquer senha batia
 * (S-18). Assíncrono: o scrypt roda fora da linha principal e não para a API a cada login.
 *
 * @example await verifyPassword('caixa123', storedHash) // true
 */
export async function verifyPassword(
  plainPassword: string,
  storedHash: string,
): Promise<boolean> {
  if (!STORED_HASH_PATTERN.test(storedHash)) return false;
  const [saltHex, keyHex] = storedHash.split(':');
  const expectedKey = Buffer.from(keyHex, 'hex');
  const actualKey = await scryptAsync(
    plainPassword,
    Buffer.from(saltHex, 'hex'),
    KEY_LENGTH_BYTES,
  );
  return timingSafeEqual(actualKey, expectedKey);
}
