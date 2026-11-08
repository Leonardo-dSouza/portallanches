import type { Prisma, PrismaClient } from '../generated/prisma/client.js';
import type {
  ExpenseEventDetails,
  ExpenseEventInput,
  ExpenseEventRecord,
} from './expense-events.js';

/**
 * Grava um passo do histórico do gasto na transação da mudança.
 *
 * @example await writeExpenseEvent(tx, 5, { userId: 1, details })
 */
export async function writeExpenseEvent(
  tx: Prisma.TransactionClient,
  expenseId: number,
  event: ExpenseEventInput,
): Promise<void> {
  const { kind, ...details } = event.details;
  await tx.expenseEvent.create({
    data: {
      expenseId,
      userId: event.userId,
      kind,
      details: details as Prisma.InputJsonObject,
    },
  });
}

/**
 * Lê o histórico de um gasto, do mais antigo ao mais recente, com o perfil do autor.
 *
 * @example (await listExpenseEvents(prisma, 5))[0].details.kind // 'CREATED'
 */
export async function listExpenseEvents(
  prisma: PrismaClient,
  expenseId: number,
): Promise<ExpenseEventRecord[]> {
  const rows = await prisma.expenseEvent.findMany({
    where: { expenseId },
    orderBy: { id: 'asc' },
    include: { user: { select: { role: true } } },
  });
  return rows.map((row) => ({
    id: row.id,
    at: row.createdAt,
    userRole: row.user.role,
    details: {
      kind: row.kind,
      ...(row.details as object),
    } as ExpenseEventDetails,
  }));
}
