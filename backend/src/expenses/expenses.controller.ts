import {
  Body,
  Controller,
  Delete,
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

  @Delete('expenses/:id')
  @HttpCode(204)
  remove(
    @CurrentUser() user: SessionUser,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<void> {
    return this.expenses.remove(user, id);
  }

  @Roles('ADMIN')
  @Get('closings/:date/expenses')
  listByDate(@Param('date') date: string): Promise<ExpenseRecord[]> {
    return this.expenses.listByDate(date);
  }
}
