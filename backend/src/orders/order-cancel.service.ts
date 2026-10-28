import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
} from '@nestjs/common';
import type { SessionUser } from '../auth/session-user.js';
import {
  CLOSING_LOOKUP,
  type ClosingLookup,
} from '../closing/closing-lookup.js';
import { isLiveNight } from '../closing/live-night.js';
import { BUSINESS_TIMEZONE, CLOCK, type Clock } from '../common/clock.js';
import { CashierLockGuard } from './cashier-lock.guard.js';
import { findEditableOrder, findUncanceledOrder } from './editable-order.js';
import { findViewableOrder } from './viewable-order.js';
import type { OrderEventRecord } from './order-events.js';
import { assertNoFiadoPayment } from './order-fiado.js';
import { flattenEntries } from './order-item-tree.js';
import {
  ORDER_CATALOG,
  ORDER_REPOSITORY,
  type OrderCatalog,
  type OrderRecord,
  type OrderRepository,
} from './order-repository.js';
import { saleNeeds, stockChangeFor, type SaleNeed } from './stock-needs.js';

const MIN_REASON = 3;
const MAX_REASON = 200;

/**
 * O motivo do cancelamento, aparado: obrigatório, de 3 a 200 caracteres.
 *
 * @example parseCancelReason({ reason: ' Cliente desistiu ' }) // 'Cliente desistiu'
 */
export function parseCancelReason(body: unknown): string {
  const raw = (body as { reason?: unknown } | null)?.reason;
  const reason = typeof raw === 'string' ? raw.trim() : '';
  if (reason.length >= MIN_REASON && reason.length <= MAX_REASON) return reason;
  throw new BadRequestException(
    `Motivo do cancelamento inválido: recebido ${JSON.stringify(raw)}, esperado texto de ${MIN_REASON} a ${MAX_REASON} caracteres`,
  );
}

/**
 * Cancelar no lugar de apagar (decisão do usuário, 2026-10-15): o pedido fica com o número,
 * sai dos totais e devolve o estoque; o caixa cancela sozinho dentro da trava e, fora dela, com
 * a senha do admin. Só o admin desfaz. Tudo vai para o histórico do pedido.
 */
@Injectable()
export class OrderCancelService {
  constructor(
    @Inject(ORDER_REPOSITORY) private readonly orders: OrderRepository,
    @Inject(ORDER_CATALOG) private readonly catalog: OrderCatalog,
    @Inject(CLOSING_LOOKUP) private readonly closings: ClosingLookup,
    @Inject(CashierLockGuard) private readonly lock: CashierLockGuard,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(BUSINESS_TIMEZONE) private readonly timeZone: string,
  ) {}

  /**
   * Fiado com recebimento ativo não cancela (2026-10-25): estorna antes.
   *
   * @example await cancels.cancel(user, 7, { reason: 'Cliente desistiu' });
   */
  async cancel(
    user: SessionUser,
    id: number,
    body: unknown,
  ): Promise<OrderRecord> {
    const reason = parseCancelReason(body);
    const { order, closing } = await findUncanceledOrder(
      this.orders,
      this.closings,
      user,
      id,
    );
    await assertNoFiadoPayment(this.orders, order);
    const managerAuthorized = await this.lock.authorize(user, order, body);
    const stock = stockChangeFor(
      this.isLive(closing.businessDate),
      user.id,
      [],
    );
    return this.orders.cancel(order.id, { reason, at: this.clock() }, stock, {
      userId: user.id,
      managerAuthorized,
      details: { kind: 'CANCELED', reason },
    });
  }

  /** Só o admin (a rota tem @Roles): na noite em andamento, baixa de novo o que ele tira. */
  async restore(user: SessionUser, id: number): Promise<OrderRecord> {
    const { order, closing } = await findEditableOrder(
      this.orders,
      this.closings,
      user,
      id,
    );
    if (!order.canceledAt)
      throw new ConflictException(
        `Pedido #${order.dayNumber} não está cancelado: esperado um pedido cancelado`,
      );
    const live = this.isLive(closing.businessDate);
    const needs = live ? await this.needsOf(order, closing.businessDate) : [];
    return this.orders.restore(order.id, stockChangeFor(live, user.id, needs), {
      userId: user.id,
      managerAuthorized: false,
      details: { kind: 'RESTORED' },
    });
  }

  /** O histórico, para o pop-up do pedido (o caixa só vê os da noite em andamento). */
  /** O histórico segue quem vê o pedido: o caixa vê o do fiado de outra noite (2026-10-27). */
  async listEvents(user: SessionUser, id: number): Promise<OrderEventRecord[]> {
    await findViewableOrder(this.orders, this.closings, user, id);
    return this.orders.listEvents(id);
  }

  private isLive(businessDate: string): boolean {
    return isLiveNight(businessDate, this.clock(), this.timeZone);
  }

  /** O que o pedido tira do estoque pela composição de hoje (como ao lançar). */
  private async needsOf(
    order: OrderRecord,
    businessDate: string,
  ): Promise<SaleNeed[]> {
    const lines = flattenEntries(order.items);
    const ids = lines.map((line) => line.productId);
    const products = await this.catalog.findProductsForSale(ids, businessDate);
    return saleNeeds(lines, new Map(products.map((p) => [p.id, p])));
  }
}
