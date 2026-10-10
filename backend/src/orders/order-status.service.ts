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
import { findEditableOrder } from './editable-order.js';
import {
  ORDER_REPOSITORY,
  type OrderRecord,
  type OrderRepository,
} from './order-repository.js';
import { stepStatus } from './order-status.js';

const STEP_LABEL = { 1: 'próximo', [-1]: 'anterior' } as const;

/** Andamento do pedido pela lista do caixa: um clique avança, a seta volta um passo. */
@Injectable()
export class OrderStatusService {
  constructor(
    @Inject(ORDER_REPOSITORY) private readonly orders: OrderRepository,
    @Inject(CLOSING_LOOKUP) private readonly closings: ClosingLookup,
  ) {}

  /** @example await statuses.advance(user, 7) // Em preparo → Saiu */
  advance(user: SessionUser, id: number): Promise<OrderRecord> {
    return this.step(user, id, 1);
  }

  /** @example await statuses.revert(user, 7) // Saiu → Em preparo */
  revert(user: SessionUser, id: number): Promise<OrderRecord> {
    return this.step(user, id, -1);
  }

  private async step(
    user: SessionUser,
    id: number,
    direction: 1 | -1,
  ): Promise<OrderRecord> {
    const { order } = await findEditableOrder(
      this.orders,
      this.closings,
      user,
      id,
    );
    if (order.type === null)
      throw new UnprocessableEntityException(
        `Pedido ${id} importado da planilha não tem status: esperado um pedido com tipo (balcão ou entrega)`,
      );
    const next = stepStatus(order.type, order.status, direction);
    if (next) return this.orders.updateStatus(id, next);
    throw new ConflictException(
      `Pedido ${id} já está em ${order.status}: esperado um status com ${STEP_LABEL[direction]}`,
    );
  }
}
