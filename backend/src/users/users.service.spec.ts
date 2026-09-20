import {
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { hashPassword, verifyPassword } from '../auth/password-hasher.js';
import type { SessionRevoker } from '../auth/session-revoker.js';
import type { SessionUser } from '../auth/session-user.js';
import type {
  NewUserData,
  UserRecord,
  UsersRepository,
} from './users-repository.js';
import { UsersService } from './users.service.js';

const ADMIN: SessionUser = { id: 1, name: 'admin', role: 'ADMIN' };

class FakeUsersRepository implements UsersRepository {
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
}

class FakeSessionRevoker implements SessionRevoker {
  readonly revoked: number[] = [];

  revokeSessions(userId: number): void {
    this.revoked.push(userId);
  }
}

function build() {
  const repo = new FakeUsersRepository();
  const sessions = new FakeSessionRevoker();
  return { service: new UsersService(repo, sessions), repo, sessions };
}

describe('UsersService', () => {
  it('cria usuário guardando só o hash da senha', async () => {
    const { service, repo } = build();
    const created = await service.create({
      name: 'Ana',
      username: 'ana',
      password: 'segredo1',
      role: 'CAIXA',
    });
    expect(created).not.toHaveProperty('passwordHash');
    expect(verifyPassword('segredo1', repo.hashes.get(created.id)!)).toBe(true);
  });

  it('desativar usuário derruba suas sessões', async () => {
    const { service, sessions } = build();
    await service.update(ADMIN, 2, {
      name: 'caixa',
      role: 'CAIXA',
      active: false,
    });
    expect(sessions.revoked).toEqual([2]);
  });

  it('admin não pode desativar nem rebaixar a si mesmo', async () => {
    const { service } = build();
    await expect(
      service.update(ADMIN, 1, { name: 'admin', role: 'ADMIN', active: false }),
    ).rejects.toThrow(BadRequestException);
    await expect(
      service.update(ADMIN, 1, { name: 'admin', role: 'CAIXA', active: true }),
    ).rejects.toThrow(/rebaixar/);
  });

  it('admin redefine a senha de outro usuário e derruba as sessões dele', async () => {
    const { service, repo, sessions } = build();
    await service.resetPassword(2, { newPassword: 'novasenha' });
    expect(verifyPassword('novasenha', repo.hashes.get(2)!)).toBe(true);
    expect(sessions.revoked).toEqual([2]);
  });

  it('redefinir senha de usuário inexistente dá 404', async () => {
    await expect(
      build().service.resetPassword(99, { newPassword: 'novasenha' }),
    ).rejects.toThrow(NotFoundException);
  });

  it('troca a própria senha com a senha atual correta', async () => {
    const { service, repo, sessions } = build();
    await service.changeOwnPassword(ADMIN, {
      currentPassword: 'admin123',
      newPassword: 'outrasenha',
    });
    expect(verifyPassword('outrasenha', repo.hashes.get(1)!)).toBe(true);
    expect(sessions.revoked).toEqual([1]);
  });

  it('recusa a troca com a senha atual errada', async () => {
    const { service, repo } = build();
    await expect(
      service.changeOwnPassword(ADMIN, {
        currentPassword: 'errada',
        newPassword: 'outrasenha',
      }),
    ).rejects.toThrow(UnauthorizedException);
    expect(verifyPassword('admin123', repo.hashes.get(1)!)).toBe(true);
  });
});
