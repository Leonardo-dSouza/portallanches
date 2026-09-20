import type { UserRole } from '../auth/session-user.js';

export const USERS_REPOSITORY = Symbol('USERS_REPOSITORY');

/** Usuário sem o hash da senha: é o que a API expõe. */
export interface UserRecord {
  id: number;
  name: string;
  username: string;
  role: UserRole;
  active: boolean;
}

export interface NewUserData {
  name: string;
  username: string;
  passwordHash: string;
  role: UserRole;
}

export interface UsersRepository {
  list(): Promise<UserRecord[]>;
  findById(id: number): Promise<UserRecord | null>;
  findPasswordHash(id: number): Promise<string | null>;
  create(data: NewUserData): Promise<UserRecord>;
  update(
    id: number,
    changes: Pick<UserRecord, 'name' | 'role' | 'active'>,
  ): Promise<UserRecord>;
  updatePasswordHash(id: number, passwordHash: string): Promise<void>;
}
