import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { parseManagerPin } from '../auth/credential-rules.js';
import { hashPassword, verifyPassword } from '../auth/password-hasher.js';
import type { SessionUser } from '../auth/session-user.js';
import {
  USER_REPOSITORY,
  type UserRepository,
} from '../auth/user-repository.js';
import { parseObject } from '../common/input-parsers.js';
import { assertCurrentPassword } from './current-password.js';
import { USERS_REPOSITORY, type UsersRepository } from './users-repository.js';

/** Se o admin logado já tem código do gerente (a tela de Senhas mostra). */
export interface ManagerPinStatus {
  configured: boolean;
}

/**
 * Código do gerente de cada admin (2026-11-15, S-04): 6 números que liberam a trava do caixa no
 * lugar da senha de login. Só o próprio admin cadastra, com a senha atual.
 *
 * @example await pins.setOwn(admin, { currentPassword: '…', pin: '482915' });
 */
@Injectable()
export class ManagerPinService {
  constructor(
    @Inject(USERS_REPOSITORY) private readonly users: UsersRepository,
    @Inject(USER_REPOSITORY) private readonly admins: UserRepository,
  ) {}

  async statusFor(actor: SessionUser): Promise<ManagerPinStatus> {
    const hash = await this.users.findManagerPinHash(actor.id);
    return { configured: hash !== null };
  }

  async setOwn(actor: SessionUser, body: unknown): Promise<void> {
    const fields = parseObject(body, 'código do gerente');
    const pin = parseManagerPin(fields.pin, 'pin');
    await assertCurrentPassword(this.users, actor.id, fields.currentPassword);
    await this.assertNotTaken(actor.id, pin);
    await this.users.updateManagerPinHash(actor.id, hashPassword(pin));
  }

  /** Dois admins com o mesmo código: a trava não saberia quem liberou. */
  private async assertNotTaken(actorId: number, pin: string): Promise<void> {
    const others = (await this.admins.listActiveAdminPins()).filter(
      (admin) => admin.userId !== actorId,
    );
    const taken = await Promise.all(
      others.map((admin) => verifyPassword(pin, admin.pinHash)),
    );
    if (!taken.includes(true)) return;
    throw new BadRequestException(
      'Campo "pin" inválido: esse código já é de outro admin, esperado outro',
    );
  }
}
