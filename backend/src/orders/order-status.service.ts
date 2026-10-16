import {
  ConflictException,
  Inject,
  Injectable,
  UnprocessableEntityException,
} from '@nestjs/common';
import type { SessionUser } from '../auth/session-user.js';
import {
  CLOSING_LOOKUP,
  type ClosingLookup,
} from '../closing/closing-lookup.js';
import { CLOCK, type Clock } from '../common/clock.js';
import { parseChoice, parseObject } from '../common/input-parsers.js';
import { findUncanceledOrder } from './editable-order.js';
import {
  ORDER_REPOSITORY,
  type OrderRecord,
  type OrderRepository,
} from './order-repository.js';
import { stepStatus, type OrderStatus } from './order-status.js';

const STEP_LABEL = { 1: 'próximo', [-1]: 'anterior' } as const;
const STATUSES: readonly OrderStatus[] = [
  'PREPARING',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
];

/**
 * O status que a tela mostrava (`{ from }`): o passo só vale a partir dele (2026-10-15: dois
 * cliques rápidos pulavam o "Saiu").
 *
 * @example parseFromStatus({ from: 'PREPARING' }) // 'PREPARING'
 */
export function parseFromStatus(body: unknown): OrderStatus {
  const fields = parseObject(body, 'status de origem ({ from })');
  return parseChoice(fields.from, 'from', STATUSES);
}

function staleStatus(order: OrderRecord, from: OrderStatus): never {
  throw new ConflictException(
    `Pedido #${order.dayNumber} já está em ${order.status}, não em ${from}: esperado o status que a tela mostrava (outro clique ou outra tela já mudou)`,
  );
}

/**
 * Andamento do pedido pela lista do caixa: um clique avança, a seta volta um passo. Cada passo
 * grava a hora (o "há 12 min" da lista) e vai para o histórico.
 */
@Injectable()
export class OrderStatusService {
  constructor(
    @Inject(ORDER_REPOSITORY) private readonly orders: OrderRepository,
    @Inject(CLOSING_LOOKUP) private readonly closings: ClosingLookup,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  /** @example await statuses.advance(user, 7, { from: 'PREPARING' }) // → Saiu */
  advance(user: SessionUser, id: number, body: unknown): Promise<OrderRecord> {
    return this.step(user, id, 1, body);
  }

  /** @example await statuses.revert(user, 7, { from: 'OUT_FOR_DELIVERY' }) // → Em preparo */
  revert(user: SessionUser, id: number, body: unknown): Promise<OrderRecord> {
    return this.step(user, id, -1, body);
  }

  private async step(
    user: SessionUser,
    id: number,
    direction: 1 | -1,
    body: unknown,
  ): Promise<OrderRecord> {
    const from = parseFromStatus(body);
    const { order } = await findUncanceledOrder(
      this.orders,
      this.closings,
      user,
      id,
    );
    if (order.type === null)
      throw new UnprocessableEntityException(
        `Pedido ${id} importado da planilha não tem status: esperado um pedido com tipo (balcão ou entrega)`,
      );
    if (order.status !== from) staleStatus(order, from);
    const to = stepStatus(order.type, from, direction);
    if (!to)
      throw new ConflictException(
        `Pedido ${id} já está em ${from}: esperado um status com ${STEP_LABEL[direction]}`,
      );
    const changed = await this.orders.updateStatus(
      id,
      { from, to, at: this.clock() },
      {
        userId: user.id,
        managerAuthorized: false,
        details: { kind: 'STATUS', from, to },
      },
    );
    return changed ?? staleStatus(order, from);
  }
}
