import { Inject, Injectable } from '@nestjs/common';
import { ExpenseType, PrismaClient } from '../generated/prisma/client.js';
import { DATABASE_CLIENT } from '../prisma/prisma.service.js';
import type {
  ExpenseTypeData,
  ExpenseTypeRecord,
  ExpenseTypeRepository,
} from './expense-type-repository.js';

const toRecord = (row: ExpenseType): ExpenseTypeRecord => ({
  id: row.id,
  name: row.name,
  nameKey: row.nameKey,
  active: row.active,
});

@Injectable()
export class PrismaExpenseTypeRepository implements ExpenseTypeRepository {
  constructor(@Inject(DATABASE_CLIENT) private readonly prisma: PrismaClient) {}

  async list(): Promise<ExpenseTypeRecord[]> {
    const rows = await this.prisma.expenseType.findMany({
      orderBy: { name: 'asc' },
    });
    return rows.map(toRecord);
  }

  async findById(id: number): Promise<ExpenseTypeRecord | null> {
    const row = await this.prisma.expenseType.findUnique({ where: { id } });
    return row && toRecord(row);
  }

  async create(data: ExpenseTypeData): Promise<ExpenseTypeRecord> {
    return toRecord(await this.prisma.expenseType.create({ data }));
  }

  async update(id: number, data: ExpenseTypeData): Promise<ExpenseTypeRecord> {
    return toRecord(
      await this.prisma.expenseType.update({ where: { id }, data }),
    );
  }
}
