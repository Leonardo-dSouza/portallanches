import { BadRequestException } from '@nestjs/common';
import type { UserRole } from './session-user.js';

/** Nome de usuário aceito no cadastro e no login: 3 a 30 caracteres entre a-z, 0-9, `.`, `-` e `_`. */
export const USERNAME_PATTERN = /^[a-z0-9._-]{3,30}$/;

/** Senha mais longa que o login confere (o scrypt não precisa ler megabytes por tentativa). */
export const MAX_PASSWORD_LENGTH = 128;

/**
 * Recusa (400) usuário fora do padrão ou senha longa demais antes de tocar no limitador: um "usuário"
 * de megabytes virava chave do mapa de tentativas e voltava inteiro na resposta (S-06, 2026-11-15).
 * A mensagem nunca repete o que veio.
 *
 * @example assertLoginShape('caixa', 'segredo1'); // passa calado
 */
export function assertLoginShape(username: string, password: string): void {
  if (!USERNAME_PATTERN.test(username))
    throw new BadRequestException(
      'Usuário inválido: esperado 3 a 30 caracteres entre a-z, 0-9, ponto, hífen e sublinhado',
    );
  if (password.length > MAX_PASSWORD_LENGTH)
    throw new BadRequestException(
      `Senha inválida: esperado até ${MAX_PASSWORD_LENGTH} caracteres`,
    );
}

/** Mínimo de senha nova por perfil (decisão do usuário, 2026-11-15, S-18). As atuais seguem valendo. */
export const MIN_PASSWORD_LENGTH: Readonly<Record<UserRole, number>> = {
  ADMIN: 10,
  CAIXA: 8,
};

/** Óbvias demais para a internet: as do seed, as do sistema e as sequências mais usadas. */
const BLOCKED_PASSWORDS = new Set([
  '00000000',
  '11111111',
  '12345678',
  '123456789',
  '1234567890',
  '87654321',
  'abc12345',
  'admin123',
  'admin1234',
  'caixa123',
  'caixa1234',
  'lanchonete',
  'lanchonete123',
  'mudar123',
  'password',
  'password1',
  'portal123',
  'portallanches',
  'qwerty123',
  'senha123',
  'senha1234',
]);

/**
 * Senha nova: o mínimo do perfil, até 128, fora da lista de óbvias e diferente do usuário. A
 * mensagem nunca repete a senha.
 *
 * @example parseNewPassword('cebola-roxa-77', 'newPassword', 'ADMIN') // 'cebola-roxa-77'
 */
export function parseNewPassword(
  raw: unknown,
  field: string,
  role: UserRole,
  username?: string,
): string {
  const min = MIN_PASSWORD_LENGTH[role];
  const fits =
    typeof raw === 'string' &&
    raw.length >= min &&
    raw.length <= MAX_PASSWORD_LENGTH;
  if (!fits)
    throw new BadRequestException(
      `Campo "${field}" inválido: esperado texto de ${min} a ${MAX_PASSWORD_LENGTH} caracteres para ${role}`,
    );
  const lowered = raw.toLowerCase();
  if (BLOCKED_PASSWORDS.has(lowered) || lowered === username?.toLowerCase())
    throw new BadRequestException(
      `Campo "${field}" inválido: senha óbvia demais (da lista de senhas comuns ou igual ao usuário), esperado outra`,
    );
  return raw;
}

const MANAGER_PIN_PATTERN = /^\d{6}$/;

/** Números todos iguais ou em sequência (111111, 123456, 987654): os primeiros que alguém chuta. */
function isObviousPin(pin: string): boolean {
  const digits = pin.split('').map(Number);
  const steps = new Set(digits.slice(1).map((digit, i) => digit - digits[i]));
  const [step] = [...steps];
  return steps.size === 1 && Math.abs(step) <= 1;
}

/**
 * Código do gerente novo (2026-11-15, S-04): 6 números, sem os óbvios. A mensagem nunca repete o
 * código.
 *
 * @example parseManagerPin('482915', 'pin') // '482915'
 */
export function parseManagerPin(raw: unknown, field: string): string {
  if (typeof raw !== 'string' || !MANAGER_PIN_PATTERN.test(raw))
    throw new BadRequestException(
      `Campo "${field}" inválido: esperado o código do gerente com 6 números`,
    );
  if (isObviousPin(raw))
    throw new BadRequestException(
      `Campo "${field}" inválido: código óbvio demais (números repetidos ou em sequência), esperado outro`,
    );
  return raw;
}
