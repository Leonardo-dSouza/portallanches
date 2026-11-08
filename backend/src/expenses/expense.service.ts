import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import type { SessionUser } from '../auth/session-user.js';
import {
  CLOSING_LOOKUP,
  type ClosingLookup,
} from '../closing/closing-lookup.js';
import { CLOCK, type Clock } from '../common/clock.js';
import {
  snapshotOfExpense,
  type ExpenseEventRecord,
  type ExpenseInvoiceSnapshot,
  type ExpenseSnapshot,
} from './expense-events.js';
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
  type ExpenseData,
  type ExpenseInvoiceChange,
  type ExpenseRecord,
  type ExpenseRepository,
} from './expense-repository.js';
import {
  assertNoInvoiceDiscount,
  assertNoInvoiceMarks,
  assertOutsidePositions,
  outsideGrossCentsOf,
  resolveBusinessDiscount,
} from './outside-items.js';

@Injectable()
export class ExpenseService {
  constructor(
    @Inject(EXPENSE_REPOSITORY) private readonly expenses: ExpenseRepository,
    @Inject(CLOSING_LOOKUP) private readonly closings: ClosingLookup,
    @Inject(ExpenseTypeService) private readonly types: ExpenseTypeService,
    @Inject(ExpenseInvoiceReader)
    private readonly invoiceReader: ExpenseInvoiceReader,
    @Optional()
    @Inject(CLOCK)
    private readonly clock: Clock = () => new Date(),
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
    const {
      invoiceCode,
      invoicePage,
      outsidePositions,
      businessDiscount,
      ...data
    } = parseExpenseInput(body);
    const closing = await this.closings.getOrCreateFor(user, rawDate);
    this.closings.assertEditable(user, closing);
    await this.types.requireActive(data.expenseTypeId);
    if (!invoiceCode) {
      assertNoInvoiceMarks(outsidePositions);
      assertNoInvoiceDiscount(businessDiscount);
    }
    const invoice = invoiceCode
      ? await this.attach(
          sourceOf(invoiceCode, invoicePage),
          null,
          outsidePositions,
          businessDiscount,
        )
      : null;
    return this.expenses.create(closing.id, user.id, data, invoice, {
      userId: user.id,
      details: { kind: 'CREATED', expense: createdSnapshot(data, invoice) },
    });
  }

  async replace(
    user: SessionUser,
    id: number,
    body: unknown,
  ): Promise<ExpenseRecord> {
    const {
      invoiceCode,
      invoicePage,
      outsidePositions,
      businessDiscount,
      ...data
    } = parseExpenseInput(body);
    const existing = await this.findEditable(user, id);
    if (existing.canceledAt)
      throw new ConflictException(
        `Gasto #${existing.id} já cancelado: esperado gasto ativo`,
      );
    await this.types.requireActive(data.expenseTypeId);
    const change = await this.invoiceChange(
      { invoiceCode, invoicePage, outsidePositions, businessDiscount },
      existing,
    );
    return this.expenses.update(existing.id, data, change, {
      userId: user.id,
      details: {
        kind: 'EDITED',
        before: snapshotOfExpense(existing),
        after: afterSnapshot(data, existing, change),
      },
    });
  }

  /**
   * Cancela o gasto no lugar de apagar (decisão de 2026-11-08). Fica na lista riscado
   * e sai de todas as somas.
   *
   * @example await service.cancel(user, 12);
   */
  async cancel(user: SessionUser, id: number): Promise<ExpenseRecord> {
    const existing = await this.findEditable(user, id);
    if (existing.canceledAt)
      throw new ConflictException(
        `Gasto #${existing.id} já cancelado: esperado gasto ativo`,
      );
    return this.expenses.cancel(existing.id, user.id, this.clock(), {
      userId: user.id,
      details: { kind: 'CANCELED' },
    });
  }

  /**
   * Restaura um gasto cancelado. Exclusivo para o admin (rota com @Roles('ADMIN')).
   *
   * @example await service.restore(adminUser, 12);
   */
  async restore(user: SessionUser, id: number): Promise<ExpenseRecord> {
    const existing = await this.findEditable(user, id);
    if (!existing.canceledAt)
      throw new ConflictException(
        `Gasto #${existing.id} não está cancelado: esperado um gasto cancelado`,
      );
    return this.expenses.restore(existing.id, {
      userId: user.id,
      details: { kind: 'RESTORED' },
    });
  }

  /**
   * O histórico de eventos do gasto. Exclusivo para o admin.
   *
   * @example await service.listEvents(12);
   */
  async listEvents(id: number): Promise<ExpenseEventRecord[]> {
    const existing = await this.expenses.findById(id);
    if (!existing) throw new NotFoundException(`Gasto ${id} não encontrado`);
    return this.expenses.listEvents(id);
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
      'invoiceCode' | 'invoicePage' | 'outsidePositions' | 'businessDiscount'
    >,
    existing: ExpenseRecord,
  ): Promise<ExpenseInvoiceChange> {
    const { invoiceCode, invoicePage, outsidePositions, businessDiscount } =
      input;
    if (invoiceCode === undefined)
      return keptInvoice(existing, outsidePositions, businessDiscount);
    if (invoiceCode === null) {
      assertNoInvoiceMarks(outsidePositions);
      assertNoInvoiceDiscount(businessDiscount);
      return { kind: 'remove' };
    }
    const attached = await this.attach(
      sourceOf(invoiceCode, invoicePage),
      existing.id,
      outsidePositions,
      businessDiscount,
    );
    return { kind: 'attach', ...attached };
  }

  /** Lê a nota e confere as marcas contra os itens dela (sem lista = a nota inteira). */
  private async attach(
    source: InvoiceSource,
    ownExpenseId: number | null,
    outsidePositions: number[] = [],
    businessDiscount?: string,
  ): Promise<AttachedInvoice> {
    const invoice = await this.invoiceReader.readUnused(source, ownExpenseId);
    assertOutsidePositions(outsidePositions, invoice.items.length);
    const outsideGrossCents = outsideGrossCentsOf(
      invoice.items,
      outsidePositions,
    );
    const discount = resolveBusinessDiscount(
      outsidePositions,
      businessDiscount,
      invoice.discount,
      outsideGrossCents,
    );
    return { invoice, outsidePositions, businessDiscount: discount };
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

function keptBusinessDiscount(
  existing: ExpenseRecord,
  effectivePositions: number[],
  businessDiscount?: string,
): string | undefined {
  if (businessDiscount === undefined) return undefined;
  const outsideGrossCents = existing.invoiceItems
    ? outsideGrossCentsOf(existing.invoiceItems, effectivePositions)
    : undefined;
  return resolveBusinessDiscount(
    effectivePositions,
    businessDiscount,
    existing.invoiceDiscount ?? '0.00',
    outsideGrossCents,
  );
}

/** Nota mantida: a lista nova troca as marcas (conferida pelos itens da nota); sem lista, ficam. */
function keptInvoice(
  existing: ExpenseRecord,
  outsidePositions: number[] | undefined,
  businessDiscount?: string,
): ExpenseInvoiceChange {
  if (outsidePositions === undefined && businessDiscount === undefined)
    return { kind: 'keep' };
  if (!existing.invoice) {
    assertNoInvoiceMarks(outsidePositions);
    assertNoInvoiceDiscount(businessDiscount);
    return { kind: 'keep' };
  }
  if (outsidePositions !== undefined)
    assertOutsidePositions(outsidePositions, existing.invoice.itemCount);
  const effectivePositions =
    outsidePositions ??
    existing.invoiceItems
      ?.filter((item) => item.outsideBusiness)
      .map((item) => item.position) ??
    [];
  const discount = keptBusinessDiscount(
    existing,
    effectivePositions,
    businessDiscount,
  );
  return {
    kind: 'keep',
    ...(outsidePositions !== undefined ? { outsidePositions } : {}),
    ...(discount !== undefined ? { businessDiscount: discount } : {}),
  };
}

function createdSnapshot(
  data: ExpenseData,
  invoice: AttachedInvoice | null,
): ExpenseSnapshot {
  return {
    amount: data.amount,
    expenseTypeId: data.expenseTypeId,
    description: data.description,
    invoice: invoice
      ? {
          vendorName: invoice.invoice.issuerName,
          outsideCount: invoice.outsidePositions.length,
        }
      : null,
    paymentLabel: invoice?.invoice.paymentLabel ?? null,
  };
}

function afterSnapshot(
  data: ExpenseData,
  existing: ExpenseRecord,
  change: ExpenseInvoiceChange,
): ExpenseSnapshot {
  return {
    amount: data.amount,
    expenseTypeId: data.expenseTypeId,
    description: data.description,
    invoice: invoiceAfter(existing, change),
    paymentLabel: paymentLabelAfter(existing, change),
  };
}

function invoiceAfter(
  existing: ExpenseRecord,
  change: ExpenseInvoiceChange,
): ExpenseInvoiceSnapshot | null {
  if (change.kind === 'remove') return null;
  if (change.kind === 'attach') {
    return {
      vendorName: change.invoice.issuerName,
      outsideCount: change.outsidePositions.length,
    };
  }
  if (!existing.invoice) return null;
  return {
    vendorName: existing.invoice.vendorName,
    outsideCount:
      change.outsidePositions?.length ?? existing.invoice.outsideItemCount,
  };
}

function paymentLabelAfter(
  existing: ExpenseRecord,
  change: ExpenseInvoiceChange,
): string | null {
  if (change.kind === 'remove') return null;
  if (change.kind === 'attach') return change.invoice.paymentLabel ?? null;
  return existing.invoice?.paymentLabel ?? null;
}
