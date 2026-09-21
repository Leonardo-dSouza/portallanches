import type { PlannedDay } from './import-types.js';

/** Onde o plano é gravado; a implementação real usa o Prisma (ver `prisma-import.target.ts`). */
export interface ImportTarget {
  /** Datas (`YYYY-MM-DD`) que já têm fechamento no banco. */
  findExistingDates(dates: string[]): Promise<string[]>;
  /** Grava todos os dias em uma única transação: ou entra tudo, ou nada. */
  writeDays(days: PlannedDay[]): Promise<void>;
}
