import { NotFoundException } from '@nestjs/common';
import type { SessionUser } from '../auth/session-user.js';
import type { ClosingLookup } from '../closing/closing-lookup.js';
import type { ClosingRecord } from '../closing/closing-repository.js';
import type { OrderRecord, OrderRepository } from './order-repository.js';

/**
 * O pedido e o fechamento dele, se o usuário pode mexer naquele dia (caixa: dia aberto e na
 * janela; admin: qualquer um). Usado para editar, apagar e mudar o status.
 *
 * @example const { order, closing } = await findEditableOrder(orders, closings, user, 7);
 */
export async function findEditableOrder(
  orders: OrderRepository,
  closings: ClosingLookup,
  user: SessionUser,
  id: number,
): Promise<{ order: OrderRecord; closing: ClosingRecord }> {
  const order = await orders.findById(id);
  if (!order) throw new NotFoundException(`Pedido ${id} não encontrado`);
  const closing = await closings.getById(order.closingId);
  closings.assertEditable(user, closing);
  return { order, closing };
}
