import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { SessionUser } from '../auth/session-user.js';
import { assertCanEditClosing } from '../closing/closing-access.js';
import {
  CLOSING_LOOKUP,
  type ClosingLookup,
} from '../closing/closing-lookup.js';
import { parseExpenseInput } from './expense-input.js';
import {
  EXPENSE_REPOSITORY,
  type ExpenseRecord,
  type ExpenseRepository,
} from './expense-repository.js';

@Injectable()
export class ExpenseService {
  constructor(
    @Inject(EXPENSE_REPOSITORY) private readonly expenses: ExpenseRepository,
    @Inject(CLOSING_LOOKUP) private readonly closings: ClosingLookup,
  ) {}

  /**
   * Lança um gasto/compra no fechamento de hoje.
   *
   * @example await service.create(user, { description: 'Gás', amount: 120 });
   */
  async create(user: SessionUser, body: unknown): Promise<ExpenseRecord> {
    const data = parseExpenseInput(body);
    const today = await this.closings.getOrCreateToday();
    assertCanEditClosing(user, today, today.id);
    return this.expenses.create(today.id, user.id, data);
  }

  async replace(
    user: SessionUser,
    id: number,
    body: unknown,
  ): Promise<ExpenseRecord> {
    const data = parseExpenseInput(body);
    const existing = await this.findEditable(user, id);
    return this.expenses.update(existing.id, data);
  }

  async remove(user: SessionUser, id: number): Promise<void> {
    const existing = await this.findEditable(user, id);
    await this.expenses.delete(existing.id);
  }

  async listToday(): Promise<ExpenseRecord[]> {
    const today = await this.closings.getOrCreateToday();
    return this.expenses.listByClosing(today.id);
  }

  async listByDate(rawDate: string): Promise<ExpenseRecord[]> {
    const closing = await this.closings.getByDate(rawDate);
    return this.expenses.listByClosing(closing.id);
  }

  private async findEditable(
    user: SessionUser,
    id: number,
  ): Promise<ExpenseRecord> {
    const existing = await this.expenses.findById(id);
    if (!existing) throw new NotFoundException(`Gasto ${id} não encontrado`);
    const today = await this.closings.getOrCreateToday();
    assertCanEditClosing(user, today, existing.closingId);
    return existing;
  }
}
