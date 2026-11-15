import { BadRequestException } from '@nestjs/common';

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
