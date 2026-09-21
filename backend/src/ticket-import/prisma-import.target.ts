import type { PrismaClient } from '../generated/prisma/client.js';
import { toNeighborhoodKey } from '../delivery/neighborhood-key.js';
import type { ImportTarget } from './import-target.js';
import type { PlannedDay } from './import-types.js';

export const MOTOBOY_EXPENSE_TYPE = 'Motoboy';
export const UNCATEGORIZED_EXPENSE_TYPE = 'Importado (sem categoria)';
export const IMPORT_NOTE = 'Importado da planilha ticket-medio-2026';

const TRANSACTION_TIMEOUT_MS = 5 * 60_000;

const toDbDate = (date: string): Date => new Date(`${date}T00:00:00Z`);

/** Fim do dia no fuso da lanchonete (UTC-3, sem horário de verão desde 2019). */
const endOfBusinessDay = (date: string): Date =>
  new Date(`${date}T23:59:00-03:00`);

export class PrismaImportTarget implements ImportTarget {
  constructor(private readonly prisma: PrismaClient) {}

  async findExistingDates(dates: string[]): Promise<string[]> {
    const rows = await this.prisma.dailyClosing.findMany({
      where: { businessDate: { in: dates.map(toDbDate) } },
      select: { businessDate: true },
    });
    return rows.map((row) => row.businessDate.toISOString().slice(0, 10));
  }

  async writeDays(days: PlannedDay[]): Promise<void> {
    await this.prisma.$transaction(
      async (tx) => {
        const adminId = await findAdminId(tx);
        const motoboyTypeId = await ensureExpenseType(tx, MOTOBOY_EXPENSE_TYPE);
        const otherTypeId = await ensureExpenseType(
          tx,
          UNCATEGORIZED_EXPENSE_TYPE,
        );
        for (const day of days) {
          await tx.dailyClosing.create({
            data: closingData(day, adminId, motoboyTypeId, otherTypeId),
          });
        }
      },
      { timeout: TRANSACTION_TIMEOUT_MS },
    );
  }
}

type Tx = Parameters<Parameters<PrismaClient['$transaction']>[0]>[0];

async function findAdminId(tx: Tx): Promise<number> {
  const admin = await tx.user.findFirst({
    where: { role: 'ADMIN', active: true },
    orderBy: { id: 'asc' },
  });
  if (admin) return admin.id;
  throw new Error(
    'Nenhum usuário ADMIN ativo encontrado: esperado ao menos um admin para ser o autor dos lançamentos importados',
  );
}

async function ensureExpenseType(tx: Tx, name: string): Promise<number> {
  const nameKey = toNeighborhoodKey(name);
  const type = await tx.expenseType.upsert({
    where: { nameKey },
    update: {},
    create: { name, nameKey },
  });
  return type.id;
}

function closingData(
  day: PlannedDay,
  adminId: number,
  motoboyTypeId: number,
  otherTypeId: number,
) {
  const expense = (expenseTypeId: number, amount: string) => ({
    expenseTypeId,
    amount,
    createdById: adminId,
  });
  return {
    businessDate: toDbDate(day.date),
    status: 'CLOSED' as const,
    // A diária do motoboy da planilha entra como gasto "Motoboy"; 0 evita contar duas vezes.
    motoboyDailyRate: '0.00',
    closedById: adminId,
    closedAt: endOfBusinessDay(day.date),
    notes: IMPORT_NOTE,
    orders: {
      create: day.orderAmounts.map((amount) => ({
        amount,
        type: null,
        paymentMethodId: null,
        deliveryFee: null,
        createdById: adminId,
      })),
    },
    expenses: {
      create: [
        ...(day.motoboy ? [expense(motoboyTypeId, day.motoboy)] : []),
        ...day.otherExpenses.map((amount) => expense(otherTypeId, amount)),
      ],
    },
  };
}
