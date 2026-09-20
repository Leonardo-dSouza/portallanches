import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { hashPassword, verifyPassword } from '../auth/password-hasher.js';
import {
  SESSION_REVOKER,
  type SessionRevoker,
} from '../auth/session-revoker.js';
import type { SessionUser } from '../auth/session-user.js';
import { parseObject } from '../common/input-parsers.js';
import {
  parseNewUserInput,
  parsePassword,
  parseUserChangesInput,
} from './users-input.js';
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

  /** O admin não pode se desativar nem se rebaixar: evitaria ficar sem ninguém para administrar. */
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
    const updated = await this.users.update(id, changes);
    if (!updated.active) this.sessions.revokeSessions(id);
    return updated;
  }

  async resetPassword(id: number, body: unknown): Promise<void> {
    const newPassword = parsePassword(
      parseObject(body, 'senha').newPassword,
      'newPassword',
    );
    if (!(await this.users.findById(id))) {
      throw new NotFoundException(`Usuário ${id} não encontrado`);
    }
    await this.users.updatePasswordHash(id, hashPassword(newPassword));
    this.sessions.revokeSessions(id);
  }

  /** Troca da própria senha: exige a senha atual e encerra as sessões abertas. */
  async changeOwnPassword(actor: SessionUser, body: unknown): Promise<void> {
    const fields = parseObject(body, 'senha');
    const newPassword = parsePassword(fields.newPassword, 'newPassword');
    const storedHash = await this.users.findPasswordHash(actor.id);
    const current =
      typeof fields.currentPassword === 'string' ? fields.currentPassword : '';
    if (!storedHash || !verifyPassword(current, storedHash)) {
      throw new UnauthorizedException(
        'Senha atual incorreta: esperado o valor de "currentPassword"',
      );
    }
    await this.users.updatePasswordHash(actor.id, hashPassword(newPassword));
    this.sessions.revokeSessions(actor.id);
  }
}
