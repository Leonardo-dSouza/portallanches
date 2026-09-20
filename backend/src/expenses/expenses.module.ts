import { Module } from '@nestjs/common';
import { ClosingModule } from '../closing/closing.module.js';
import { EXPENSE_REPOSITORY } from './expense-repository.js';
import { ExpenseService } from './expense.service.js';
import { ExpensesController } from './expenses.controller.js';
import { PrismaExpenseRepository } from './prisma-expense.repository.js';

@Module({
  imports: [ClosingModule],
  controllers: [ExpensesController],
  providers: [
    ExpenseService,
    { provide: EXPENSE_REPOSITORY, useClass: PrismaExpenseRepository },
  ],
})
export class ExpensesModule {}
