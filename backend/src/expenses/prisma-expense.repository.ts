import { Inject, Injectable } from '@nestjs/common';
import { Expense, PrismaClient } from '../generated/prisma/client.js';
import { DATABASE_CLIENT } from '../prisma/prisma.service.js';
import type {
  ExpenseData,
  ExpenseRecord,
  ExpenseRepository,
} from './expense-repository.js';

function toRecord(row: Expense): ExpenseRecord {
  return {
    id: row.id,
    closingId: row.closingId,
    createdById: row.createdById,
    description: row.description,
    amount: row.amount.toFixed(2),
  };
}

@Injectable()
export class PrismaExpenseRepository implements ExpenseRepository {
  constructor(@Inject(DATABASE_CLIENT) private readonly prisma: PrismaClient) {}

  async create(
    closingId: number,
    createdById: number,
    data: ExpenseData,
  ): Promise<ExpenseRecord> {
    const row = await this.prisma.expense.create({
      data: { ...data, closingId, createdById },
    });
    return toRecord(row);
  }

  async findById(id: number): Promise<ExpenseRecord | null> {
    const row = await this.prisma.expense.findUnique({ where: { id } });
    return row && toRecord(row);
  }

  async update(id: number, data: ExpenseData): Promise<ExpenseRecord> {
    return toRecord(await this.prisma.expense.update({ where: { id }, data }));
  }

  async delete(id: number): Promise<void> {
    await this.prisma.expense.delete({ where: { id } });
  }

  async listByClosing(closingId: number): Promise<ExpenseRecord[]> {
    const rows = await this.prisma.expense.findMany({
      where: { closingId },
      orderBy: { id: 'asc' },
    });
    return rows.map(toRecord);
  }
}
