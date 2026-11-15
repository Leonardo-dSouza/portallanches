import {
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { verifyPassword } from '../auth/password-hasher.js';
import type { SessionRevoker } from '../auth/session-revoker.js';
import type { SessionUser } from '../auth/session-user.js';
import { FakeUsersRepository } from './users-fakes.fixture.js';
import { UsersService } from './users.service.js';

const ADMIN: SessionUser = { id: 1, name: 'admin', role: 'ADMIN' };

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
      password: 'cebola-roxa',
      role: 'CAIXA',
    });
    expect(created).not.toHaveProperty('passwordHash');
    expect(
      await verifyPassword('cebola-roxa', repo.hashes.get(created.id)!),
    ).toBe(true);
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

  it('trocar o perfil derruba as sessões; só mudar o nome não (S-08)', async () => {
    const { service, sessions } = build();
    await service.update(ADMIN, 2, {
      name: 'Caixa Ana',
      role: 'CAIXA',
      active: true,
    });
    expect(sessions.revoked).toEqual([]);
    await service.update(ADMIN, 2, {
      name: 'Caixa Ana',
      role: 'ADMIN',
      active: true,
    });
    expect(sessions.revoked).toEqual([2]);
  });

  it('alterar usuário inexistente dá 404', async () => {
    await expect(
      build().service.update(ADMIN, 99, {
        name: 'x',
        role: 'CAIXA',
        active: true,
      }),
    ).rejects.toThrow(NotFoundException);
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
    await service.resetPassword(ADMIN, 2, { newPassword: 'novasenha' });
    expect(await verifyPassword('novasenha', repo.hashes.get(2)!)).toBe(true);
    expect(sessions.revoked).toEqual([2]);
  });

  it('admin não troca a própria senha por aqui, sem a atual (S-02)', async () => {
    const { service, repo } = build();
    await expect(
      service.resetPassword(ADMIN, 1, { newPassword: 'cebola-roxa-77' }),
    ).rejects.toThrow(/POST \/users\/me\/password/);
    expect(await verifyPassword('admin123', repo.hashes.get(1)!)).toBe(true);
  });

  it('a senha nova segue o perfil do usuário', async () => {
    await expect(
      build().service.resetPassword(ADMIN, 2, { newPassword: 'caixa123' }),
    ).rejects.toThrow(/óbvia/);
  });

  it('redefinir senha de usuário inexistente dá 404', async () => {
    await expect(
      build().service.resetPassword(ADMIN, 99, { newPassword: 'novasenha' }),
    ).rejects.toThrow(NotFoundException);
  });

  it('troca a própria senha com a senha atual correta', async () => {
    const { service, repo, sessions } = build();
    await service.changeOwnPassword(ADMIN, {
      currentPassword: 'admin123',
      newPassword: 'outra-senha',
    });
    expect(await verifyPassword('outra-senha', repo.hashes.get(1)!)).toBe(true);
    expect(sessions.revoked).toEqual([1]);
  });

  it('recusa a troca com a senha atual errada', async () => {
    const { service, repo } = build();
    await expect(
      service.changeOwnPassword(ADMIN, {
        currentPassword: 'errada',
        newPassword: 'outra-senha',
      }),
    ).rejects.toThrow(UnauthorizedException);
    expect(await verifyPassword('admin123', repo.hashes.get(1)!)).toBe(true);
  });
});

describe('UsersService, senha do admin', () => {
  it('admin com senha nova de 9 caracteres: 400 (mínimo 10)', async () => {
    await expect(
      build().service.changeOwnPassword(ADMIN, {
        currentPassword: 'admin123',
        newPassword: 'cebola-77',
      }),
    ).rejects.toThrow(/10 a 128/);
  });
});
