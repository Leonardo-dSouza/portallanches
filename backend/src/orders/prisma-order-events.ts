import type { Prisma, PrismaClient } from '../generated/prisma/client.js';
import type {
  OrderEventDetails,
  OrderEventInput,
  OrderEventRecord,
} from './order-events.js';

/**
 * Grava um passo do histórico na transação da própria mudança: o pedido nunca muda sem deixar
 * rastro. O `kind` vai na coluna; o resto, no JSON.
 *
 * @example await writeOrderEvent(tx, 7, { userId: 2, managerAuthorized: false, details })
 */
export async function writeOrderEvent(
  tx: Prisma.TransactionClient,
  orderId: number,
  event: OrderEventInput,
): Promise<void> {
  const { kind, ...details } = event.details;
  await tx.orderEvent.create({
    data: {
      orderId,
      userId: event.userId,
      kind,
      managerAuthorized: event.managerAuthorized,
      details: details as Prisma.InputJsonObject,
    },
  });
}

/**
 * O histórico de um pedido, do mais antigo ao mais novo, com o perfil de quem fez.
 *
 * @example (await listOrderEvents(prisma, 7))[0].details.kind // 'CREATED'
 */
export async function listOrderEvents(
  prisma: PrismaClient,
  orderId: number,
): Promise<OrderEventRecord[]> {
  const rows = await prisma.orderEvent.findMany({
    where: { orderId },
    orderBy: { id: 'asc' },
    include: { user: { select: { role: true } } },
  });
  return rows.map((row) => ({
    id: row.id,
    at: row.createdAt,
    userRole: row.user.role,
    managerAuthorized: row.managerAuthorized,
    details: {
      kind: row.kind,
      ...(row.details as object),
    } as OrderEventDetails,
  }));
}
