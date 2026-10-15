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
  /** Hashes dos ADMIN ativos: a senha do admin que autoriza no PC do caixa. */
  listActiveAdminHashes(): Promise<string[]>;
}
