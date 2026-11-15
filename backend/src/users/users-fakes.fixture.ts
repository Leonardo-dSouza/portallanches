import { hashPassword } from '../auth/password-hasher.js';
import type {
  NewUserData,
  UserRecord,
  UsersRepository,
} from './users-repository.js';

/** Usuários em memória: admin (1, senha admin123) e caixa (2, senha caixa123). */
export class FakeUsersRepository implements UsersRepository {
  readonly hashes = new Map<number, string>([
    [1, hashPassword('admin123')],
    [2, hashPassword('caixa123')],
  ]);
  readonly rows: UserRecord[] = [
    { id: 1, name: 'admin', username: 'admin', role: 'ADMIN', active: true },
    { id: 2, name: 'caixa', username: 'caixa', role: 'CAIXA', active: true },
  ];

  async list(): Promise<UserRecord[]> {
    return this.rows;
  }

  async findById(id: number): Promise<UserRecord | null> {
    return this.rows.find((r) => r.id === id) ?? null;
  }

  async findPasswordHash(id: number): Promise<string | null> {
    return this.hashes.get(id) ?? null;
  }

  async create(data: NewUserData): Promise<UserRecord> {
    const { passwordHash, ...rest } = data;
    const row = { id: this.rows.length + 1, active: true, ...rest };
    this.rows.push(row);
    this.hashes.set(row.id, passwordHash);
    return row;
  }

  async update(
    id: number,
    changes: Pick<UserRecord, 'name' | 'role' | 'active'>,
  ): Promise<UserRecord> {
    const row = { ...(await this.findById(id))!, ...changes };
    this.rows[this.rows.findIndex((r) => r.id === id)] = row;
    return row;
  }

  async updatePasswordHash(id: number, passwordHash: string): Promise<void> {
    this.hashes.set(id, passwordHash);
  }

  readonly pinHashes = new Map<number, string>();

  async findManagerPinHash(id: number): Promise<string | null> {
    return this.pinHashes.get(id) ?? null;
  }

  async updateManagerPinHash(id: number, pinHash: string): Promise<void> {
    this.pinHashes.set(id, pinHash);
  }
}
