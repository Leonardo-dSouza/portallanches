import { NotFoundException } from '@nestjs/common';
import type { SessionUser } from '../auth/session-user.js';
import type { ClosingLookup } from '../closing/closing-lookup.js';
import { withFiado, type WithFiado } from './order-fiado.js';
import type { OrderRecord, OrderRepository } from './order-repository.js';

/**
 * O pedido, se o usuário pode vê-lo (2026-10-27): o admin, qualquer um; o caixa, os das noites
 * que ele vê e os fiados de qualquer noite, porque a aba Fiado cobra dívida de noites passadas e
 * mostra o pedido com os itens e o histórico.
 *
 * @example const order = await findViewableOrder(orders, closings, caixa, 7); // order.fiado
 */
export async function findViewableOrder(
  orders: OrderRepository,
  closings: ClosingLookup,
  user: SessionUser,
  id: number,
): Promise<WithFiado<OrderRecord>> {
  const order = await orders.findById(id);
  if (!order)
    throw new NotFoundException(
      `Pedido ${id} não encontrado: esperado o id de um pedido existente`,
    );
  const [viewed] = await withFiado(orders, [order]);
  if (viewed.fiado) return viewed;
  closings.assertViewable(user, await closings.getById(order.closingId));
  return viewed;
}
