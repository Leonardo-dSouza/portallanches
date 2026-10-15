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
import { isLockedForCashier } from './order-lock.js';
import type { OrderRecord } from './order-repository.js';

/**
 * A trava do caixa na prática: dentro dela a ação passa; fora, só com a senha do admin no corpo
 * (`managerPassword`). O admin logado nunca precisa. Os minutos vêm de Cadastros → Caixa.
 *
 * @example const authorized = await guard.authorize(user, order, body); // true = usou a senha
 */
@Injectable()
export class CashierLockGuard {
  constructor(
    @Inject(SETTINGS_READER) private readonly settings: SettingsReader,
    @Inject(MANAGER_AUTHORIZER) private readonly manager: ManagerAuthorizer,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  /** Devolve se a senha do admin foi usada (vai para o histórico). */
  async authorize(
    user: SessionUser,
    order: OrderRecord,
    body: unknown,
  ): Promise<boolean> {
    if (user.role === 'ADMIN') return false;
    const { cashierFixMinutes } = await this.settings.read();
    if (!isLockedForCashier(order, this.clock(), cashierFixMinutes))
      return false;
    await this.manager.authorize(managerPasswordOf(body));
    return true;
  }
}
