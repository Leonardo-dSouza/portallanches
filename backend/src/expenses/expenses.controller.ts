import {
  Body,
  Controller,
  Get,
  HttpCode,
  Inject,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { Roles } from '../auth/auth-decorators.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { SessionUser } from '../auth/session-user.js';
import type { ExpenseEventRecord } from './expense-events.js';
import type { ExpenseRecord } from './expense-repository.js';
import { ExpenseService } from './expense.service.js';

@Controller()
export class ExpensesController {
  constructor(
    @Inject(ExpenseService) private readonly expenses: ExpenseService,
  ) {}

  @Get('expenses/today')
  listFor(
    @CurrentUser() user: SessionUser,
    @Query('date') date?: string,
  ): Promise<ExpenseRecord[]> {
    return this.expenses.listFor(user, date);
  }

  @Post('expenses')
  create(
    @CurrentUser() user: SessionUser,
    @Body() body: unknown,
    @Query('date') date?: string,
  ): Promise<ExpenseRecord> {
    return this.expenses.create(user, body, date);
  }

  @Put('expenses/:id')
  replace(
    @CurrentUser() user: SessionUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: unknown,
  ): Promise<ExpenseRecord> {
    return this.expenses.replace(user, id, body);
  }

  /** Cancelar no lugar do antigo DELETE (decisão de 2026-11-08). */
  @Post('expenses/:id/cancel')
  @HttpCode(200)
  cancel(
    @CurrentUser() user: SessionUser,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<ExpenseRecord> {
    return this.expenses.cancel(user, id);
  }

  @Roles('ADMIN')
  @Post('expenses/:id/restore')
  @HttpCode(200)
  restore(
    @CurrentUser() user: SessionUser,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<ExpenseRecord> {
    return this.expenses.restore(user, id);
  }

  @Roles('ADMIN')
  @Get('expenses/:id/events')
  events(@Param('id', ParseIntPipe) id: number): Promise<ExpenseEventRecord[]> {
    return this.expenses.listEvents(id);
  }

  @Roles('ADMIN')
  @Get('closings/:date/expenses')
  listByDate(@Param('date') date: string): Promise<ExpenseRecord[]> {
    return this.expenses.listByDate(date);
  }
}
