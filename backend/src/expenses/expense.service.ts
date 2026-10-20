import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { SessionUser } from '../auth/session-user.js';
import {
  CLOSING_LOOKUP,
  type ClosingLookup,
} from '../closing/closing-lookup.js';
import { ExpenseTypeService } from './expense-type.service.js';
import { parseExpenseInput } from './expense-input.js';
import { ExpenseInvoiceReader } from './expense-invoice-reader.js';
import {
  EXPENSE_REPOSITORY,
  type ExpenseInvoiceChange,
  type ExpenseRecord,
  type ExpenseRepository,
} from './expense-repository.js';

@Injectable()
export class ExpenseService {
  constructor(
    @Inject(EXPENSE_REPOSITORY) private readonly expenses: ExpenseRepository,
    @Inject(CLOSING_LOOKUP) private readonly closings: ClosingLookup,
    @Inject(ExpenseTypeService) private readonly types: ExpenseTypeService,
    @Inject(ExpenseInvoiceReader)
    private readonly invoiceReader: ExpenseInvoiceReader,
  ) {}

  /**
   * Lança um gasto/compra no fechamento da data escolhida (padrão: hoje). Com `invoiceCode`,
   * lê a nota na SEFAZ e prende ao gasto; o valor continua o digitado.
   *
   * @example await service.create(user, { expenseTypeId: 1, amount: 120 });
   */
  async create(
    user: SessionUser,
    body: unknown,
    rawDate?: string,
  ): Promise<ExpenseRecord> {
    const { invoiceCode, ...data } = parseExpenseInput(body);
    const closing = await this.closings.getOrCreateFor(user, rawDate);
    this.closings.assertEditable(user, closing);
    await this.types.requireActive(data.expenseTypeId);
    const invoice = invoiceCode
      ? await this.invoiceReader.readUnused(invoiceCode, null)
      : null;
    return this.expenses.create(closing.id, user.id, data, invoice);
  }

  async replace(
    user: SessionUser,
    id: number,
    body: unknown,
  ): Promise<ExpenseRecord> {
    const { invoiceCode, ...data } = parseExpenseInput(body);
    const existing = await this.findEditable(user, id);
    await this.types.requireActive(data.expenseTypeId);
    const change = await this.invoiceChange(invoiceCode, existing.id);
    return this.expenses.update(existing.id, data, change);
  }

  async remove(user: SessionUser, id: number): Promise<void> {
    const existing = await this.findEditable(user, id);
    await this.expenses.delete(existing.id);
  }

  async listFor(user: SessionUser, rawDate?: string): Promise<ExpenseRecord[]> {
    const closing = await this.closings.getFor(user, rawDate);
    return this.expenses.listByClosing(closing.id);
  }

  async listByDate(rawDate: string): Promise<ExpenseRecord[]> {
    const closing = await this.closings.getByDate(rawDate);
    return this.expenses.listByClosing(closing.id);
  }

  /** Nota ausente no corpo = manter; null = tirar; texto = ler de novo e prender. */
  private async invoiceChange(
    invoiceCode: string | null | undefined,
    expenseId: number,
  ): Promise<ExpenseInvoiceChange> {
    if (invoiceCode === undefined) return { kind: 'keep' };
    if (invoiceCode === null) return { kind: 'remove' };
    const invoice = await this.invoiceReader.readUnused(invoiceCode, expenseId);
    return { kind: 'attach', invoice };
  }

  private async findEditable(
    user: SessionUser,
    id: number,
  ): Promise<ExpenseRecord> {
    const existing = await this.expenses.findById(id);
    if (!existing) throw new NotFoundException(`Gasto ${id} não encontrado`);
    const closing = await this.closings.getById(existing.closingId);
    this.closings.assertEditable(user, closing);
    return existing;
  }
}
