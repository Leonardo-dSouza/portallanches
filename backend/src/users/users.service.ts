import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { parseNewPassword } from '../auth/credential-rules.js';
import { hashPassword } from '../auth/password-hasher.js';
import {
  SESSION_REVOKER,
  type SessionRevoker,
} from '../auth/session-revoker.js';
import type { SessionUser } from '../auth/session-user.js';
import { parseObject } from '../common/input-parsers.js';
import { assertCurrentPassword } from './current-password.js';
import { parseNewUserInput, parseUserChangesInput } from './users-input.js';
import {
  USERS_REPOSITORY,
  type UserRecord,
  type UsersRepository,
} from './users-repository.js';

@Injectable()
export class UsersService {
  constructor(
    @Inject(USERS_REPOSITORY) private readonly users: UsersRepository,
    @Inject(SESSION_REVOKER) private readonly sessions: SessionRevoker,
  ) {}

  list(): Promise<UserRecord[]> {
    return this.users.list();
  }

  /** @example await service.create({ name: 'Ana', username: 'ana', password: 'segredo1', role: 'CAIXA' }) */
  create(body: unknown): Promise<UserRecord> {
    const { password, ...rest } = parseNewUserInput(body);
    return this.users.create({ ...rest, passwordHash: hashPassword(password) });
  }

  /**
   * O admin não pode se desativar nem se rebaixar: evitaria ficar sem ninguém para administrar.
   * Desativar ou trocar o perfil derruba as sessões: a sessão guarda o perfil do login, e até
   * 2026-11-15 um admin rebaixado seguia admin por até 12 h (S-08).
   */
  async update(
    actor: SessionUser,
    id: number,
    body: unknown,
  ): Promise<UserRecord> {
    const changes = parseUserChangesInput(body);
    if (actor.id === id && (!changes.active || changes.role !== 'ADMIN')) {
      throw new BadRequestException(
        `O admin ${actor.id} não pode desativar nem rebaixar a si mesmo: esperado active=true e role="ADMIN"`,
      );
    }
    const before = await this.findExisting(id);
    const updated = await this.users.update(id, changes);
    if (!updated.active || updated.role !== before.role)
      this.sessions.revokeSessions(id);
    return updated;
  }

  /**
   * O admin troca a senha de outro usuário sem a atual. A própria, só por `POST /users/me/password`
   * com a atual: com um token roubado, esta rota tomava a conta do admin de vez (S-02).
   */
  async resetPassword(
    actor: SessionUser,
    id: number,
    body: unknown,
  ): Promise<void> {
    if (actor.id === id)
      throw new BadRequestException(
        `O admin ${actor.id} troca a própria senha em POST /users/me/password: esperado a senha atual em "currentPassword"`,
      );
    const user = await this.findExisting(id);
    const newPassword = parseNewPassword(
      parseObject(body, 'senha').newPassword,
      'newPassword',
      user.role,
      user.username,
    );
    await this.users.updatePasswordHash(id, hashPassword(newPassword));
    this.sessions.revokeSessions(id);
  }

  private async findExisting(id: number): Promise<UserRecord> {
    const user = await this.users.findById(id);
    if (user) return user;
    throw new NotFoundException(`Usuário ${id} não encontrado`);
  }

  /** Troca da própria senha: exige a senha atual e encerra as sessões abertas. */
  async changeOwnPassword(actor: SessionUser, body: unknown): Promise<void> {
    const fields = parseObject(body, 'senha');
    const newPassword = parseNewPassword(
      fields.newPassword,
      'newPassword',
      actor.role,
    );
    await assertCurrentPassword(this.users, actor.id, fields.currentPassword);
    await this.users.updatePasswordHash(actor.id, hashPassword(newPassword));
    this.sessions.revokeSessions(actor.id);
  }
}
