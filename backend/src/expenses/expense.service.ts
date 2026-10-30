import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { SessionUser } from '../auth/session-user.js';
import {
  CLOSING_LOOKUP,
  type ClosingLookup,
} from '../closing/closing-lookup.js';
import { ExpenseTypeService } from './expense-type.service.js';
import {
  parseExpenseInput,
  type ExpenseInput,
  type InvoiceSource,
} from './expense-input.js';
import { ExpenseInvoiceReader } from './expense-invoice-reader.js';
import {
  EXPENSE_REPOSITORY,
  type AttachedInvoice,
  type ExpenseInvoiceChange,
  type ExpenseRecord,
  type ExpenseRepository,
} from './expense-repository.js';
import {
  assertNoInvoiceMarks,
  assertOutsidePositions,
} from './outside-items.js';

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
   * lê a nota (na SEFAZ ou em `invoicePage`, o HTML salvo) e prende ao gasto, com os itens fora
   * da lanchonete marcados (`outsidePositions`, 2026-10-25); o valor continua o digitado.
   *
   * @example await service.create(user, { expenseTypeId: 1, amount: 120 });
   */
  async create(
    user: SessionUser,
    body: unknown,
    rawDate?: string,
  ): Promise<ExpenseRecord> {
    const { invoiceCode, invoicePage, outsidePositions, ...data } =
      parseExpenseInput(body);
    const closing = await this.closings.getOrCreateFor(user, rawDate);
    this.closings.assertEditable(user, closing);
    await this.types.requireActive(data.expenseTypeId);
    if (!invoiceCode) assertNoInvoiceMarks(outsidePositions);
    const invoice = invoiceCode
      ? await this.attach(
          sourceOf(invoiceCode, invoicePage),
          null,
          outsidePositions,
        )
      : null;
    return this.expenses.create(closing.id, user.id, data, invoice);
  }

  async replace(
    user: SessionUser,
    id: number,
    body: unknown,
  ): Promise<ExpenseRecord> {
    const { invoiceCode, invoicePage, outsidePositions, ...data } =
      parseExpenseInput(body);
    const existing = await this.findEditable(user, id);
    await this.types.requireActive(data.expenseTypeId);
    const change = await this.invoiceChange(
      { invoiceCode, invoicePage, outsidePositions },
      existing,
    );
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
    input: Pick<
      ExpenseInput,
      'invoiceCode' | 'invoicePage' | 'outsidePositions'
    >,
    existing: ExpenseRecord,
  ): Promise<ExpenseInvoiceChange> {
    const { invoiceCode, invoicePage, outsidePositions } = input;
    if (invoiceCode === undefined)
      return keptInvoice(existing, outsidePositions);
    if (invoiceCode === null) {
      assertNoInvoiceMarks(outsidePositions);
      return { kind: 'remove' };
    }
    const attached = await this.attach(
      sourceOf(invoiceCode, invoicePage),
      existing.id,
      outsidePositions,
    );
    return { kind: 'attach', ...attached };
  }

  /** Lê a nota e confere as marcas contra os itens dela (sem lista = a nota inteira). */
  private async attach(
    source: InvoiceSource,
    ownExpenseId: number | null,
    outsidePositions: number[] = [],
  ): Promise<AttachedInvoice> {
    const invoice = await this.invoiceReader.readUnused(source, ownExpenseId);
    assertOutsidePositions(outsidePositions, invoice.items.length);
    return { invoice, outsidePositions };
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

/** Com o HTML salvo, o arquivo tem de ser o da nota da prévia (`code`). */
function sourceOf(code: string, page: string | undefined): InvoiceSource {
  if (page === undefined) return { kind: 'code', code };
  return { kind: 'page', html: page, expectedCode: code };
}

/** Nota mantida: a lista nova troca as marcas (conferida pelos itens da nota); sem lista, ficam. */
function keptInvoice(
  existing: ExpenseRecord,
  outsidePositions: number[] | undefined,
): ExpenseInvoiceChange {
  if (outsidePositions === undefined) return { kind: 'keep' };
  if (!existing.invoice) {
    assertNoInvoiceMarks(outsidePositions);
    return { kind: 'keep' };
  }
  assertOutsidePositions(outsidePositions, existing.invoice.itemCount);
  return { kind: 'keep', outsidePositions };
}
