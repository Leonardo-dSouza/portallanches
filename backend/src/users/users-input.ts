import { BadRequestException } from '@nestjs/common';
import {
  parseBoolean,
  parseChoice,
  parseObject,
  parseText,
} from '../common/input-parsers.js';
import { USERNAME_PATTERN } from '../auth/credential-rules.js';
import type { UserRole } from '../auth/session-user.js';
import { describeReceived } from '../common/received-value.js';

const ROLES: readonly UserRole[] = ['CAIXA', 'ADMIN'];
const MIN_PASSWORD_LENGTH = 6;
const MAX_NAME_LENGTH = 80;

export interface NewUserInput {
  name: string;
  username: string;
  password: string;
  role: UserRole;
}

export interface UserChangesInput {
  name: string;
  role: UserRole;
  active: boolean;
}

/** Senha em texto puro exige o mínimo de caracteres; nunca é ecoada na mensagem de erro. */
export function parsePassword(raw: unknown, field: string): string {
  if (typeof raw === 'string' && raw.length >= MIN_PASSWORD_LENGTH) return raw;
  throw new BadRequestException(
    `Campo "${field}" inválido: esperado texto com pelo menos ${MIN_PASSWORD_LENGTH} caracteres`,
  );
}

function parseUsername(raw: unknown): string {
  if (typeof raw === 'string' && USERNAME_PATTERN.test(raw)) return raw;
  throw new BadRequestException(
    `Campo "username" inválido: recebido ${describeReceived(raw)}, esperado 3 a 30 caracteres entre a-z, 0-9, ponto, hífen e sublinhado`,
  );
}

/** @example parseNewUserInput({ name: 'Ana', username: 'ana', password: 'segredo1', role: 'CAIXA' }) */
export function parseNewUserInput(body: unknown): NewUserInput {
  const fields = parseObject(body, 'usuário');
  return {
    name: parseText(fields.name, 'name', MAX_NAME_LENGTH),
    username: parseUsername(fields.username),
    password: parsePassword(fields.password, 'password'),
    role: parseChoice(fields.role, 'role', ROLES),
  };
}

export function parseUserChangesInput(body: unknown): UserChangesInput {
  const fields = parseObject(body, 'usuário');
  return {
    name: parseText(fields.name, 'name', MAX_NAME_LENGTH),
    role: parseChoice(fields.role, 'role', ROLES),
    active: parseBoolean(fields.active, 'active'),
  };
}
