import { Inject, Injectable } from '@nestjs/common';
import {
  MANAGER_AUTHORIZER,
  managerPasswordOf,
  type ManagerAuthorizer,
} from '../auth/manager-authorizer.js';
import type { SessionUser } from '../auth/session-user.js';
import { CLOCK, type Clock } from '../common/clock.js';
import {
  SETTINGS_READER,
  type SettingsReader,
} from '../settings/app-settings.service.js';
import { isLockedForCashier, type LockSubject } from './order-lock.js';

/**
 * A trava do caixa na prática: dentro dela a ação passa; fora, só com o código do gerente no corpo
 * (`managerPassword`). O admin logado nunca precisa. Os minutos vêm de Cadastros → Caixa.
 *
 * @example const managerId = await guard.authorize(user, order, body); // id do admin que liberou, ou null
 */
@Injectable()
export class CashierLockGuard {
  constructor(
    @Inject(SETTINGS_READER) private readonly settings: SettingsReader,
    @Inject(MANAGER_AUTHORIZER) private readonly manager: ManagerAuthorizer,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  /**
   * Devolve o admin cujo código liberou (vai para o histórico), ou null quando não precisou. Vale
   * para o pedido e, desde 2026-10-25, para o recebimento de fiado (só o tempo conta).
   */
  async authorize(
    user: SessionUser,
    subject: LockSubject,
    body: unknown,
  ): Promise<number | null> {
    if (user.role === 'ADMIN') return null;
    const { cashierFixMinutes } = await this.settings.read();
    if (!isLockedForCashier(subject, this.clock(), cashierFixMinutes))
      return null;
    return this.manager.authorize(managerPasswordOf(body));
  }
}
