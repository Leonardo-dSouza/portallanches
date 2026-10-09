/**
 * Dia de negócio (`YYYY-MM-DD`) para uma coluna `DATE` do Prisma (meia-noite UTC), sem passar
 * pelo fuso da máquina.
 *
 * @example toDbDate('2026-10-09') // 2026-10-09T00:00:00.000Z
 */
export function toDbDate(businessDate: string): Date {
  return new Date(`${businessDate}T00:00:00Z`);
}

/**
 * Coluna `DATE` lida pelo Prisma de volta para `YYYY-MM-DD`.
 *
 * @example fromDbDate(new Date('2026-10-09T00:00:00Z')) // '2026-10-09'
 */
export function fromDbDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}
