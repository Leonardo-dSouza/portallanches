import { UserRole } from './session-user.js';

export const USER_REPOSITORY = Symbol('USER_REPOSITORY');

export interface StoredUser {
  id: number;
  name: string;
  role: UserRole;
  passwordHash: string;
}

/** Acesso a usuários que a autenticação precisa; implementado sobre o Prisma. */
export interface UserRepository {
  findActiveByUsername(username: string): Promise<StoredUser | null>;
  /** Códigos do gerente dos ADMIN ativos que já cadastraram um (2026-11-15, S-04). */
  listActiveAdminPins(): Promise<AdminPin[]>;
}

/** O código do gerente (hash) de um admin, para a trava dizer quem liberou. */
export interface AdminPin {
  userId: number;
  pinHash: string;
}
