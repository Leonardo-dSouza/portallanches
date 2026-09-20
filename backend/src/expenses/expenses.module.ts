import { Module } from '@nestjs/common';
import { ClosingModule } from '../closing/closing.module.js';
import { EXPENSE_REPOSITORY } from './expense-repository.js';
import { EXPENSE_TYPE_REPOSITORY } from './expense-type-repository.js';
import { ExpenseTypeService } from './expense-type.service.js';
import { ExpenseTypesController } from './expense-types.controller.js';
import { PrismaExpenseTypeRepository } from './prisma-expense-type.repository.js';
import { ExpenseService } from './expense.service.js';
import { ExpensesController } from './expenses.controller.js';
import { PrismaExpenseRepository } from './prisma-expense.repository.js';

@Module({
  imports: [ClosingModule],
  controllers: [ExpensesController, ExpenseTypesController],
  providers: [
    ExpenseService,
    ExpenseTypeService,
    {
      provide: EXPENSE_TYPE_REPOSITORY,
      useClass: PrismaExpenseTypeRepository,
    },
    { provide: EXPENSE_REPOSITORY, useClass: PrismaExpenseRepository },
  ],
})
export class ExpensesModule {}
