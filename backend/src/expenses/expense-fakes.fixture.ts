import type { SessionUser } from '../auth/session-user.js';
import type { ClosingLookup } from '../closing/closing-lookup.js';
import {
  assertCanEditClosing,
  assertCanSelectDate,
} from '../closing/closing-access.js';
import type { ClosingRecord } from '../closing/closing-repository.js';
import { formatCents, toCents } from '../common/money.js';
import { FakeNfcePageSource } from '../nfce/nfce-fakes.fixture.js';
import type { NfceInvoice } from '../nfce/nfce-invoice.js';
import { NfceReaderService } from '../nfce/nfce-reader.service.js';
import { ExpenseInvoiceReader } from './expense-invoice-reader.js';
import type {
  ExpenseInvoiceDetail,
  ExpenseInvoiceRepository,
  InvoiceSuggestion,
  InvoiceUse,
} from './expense-invoice-repository.js';
import type {
  AttachedInvoice,
  ExpenseData,
  ExpenseInvoiceChange,
  ExpenseRecord,
  ExpenseRepository,
} from './expense-repository.js';
import type { OutsideDecision } from './outside-items.js';
import { cnpjRootOf, vendorDisplayName } from './vendor-display.js';
import type {
  ExpenseTypeData,
  ExpenseTypeRecord,
  ExpenseTypeRepository,
} from './expense-type-repository.js';

export const CAIXA: SessionUser = { id: 2, name: 'caixa', role: 'CAIXA' };
export const ADMIN: SessionUser = { id: 1, name: 'admin', role: 'ADMIN' };
export const TODAY_CLOSING_ID = 10;

interface StoredInvoice {
  id: number;
  expenseId: number;
  invoice: NfceInvoice;
  /** Posições dos itens fora da lanchonete (2026-10-25). */
  outside: Set<number>;
}

/**
 * Gastos e notas em memória, com o estado dividido como no banco: a nota fica numa tabela
 * própria (ids a partir de 101, para não se confundir com o id do gasto) e some com o gasto.
 */
export class FakeExpenseRepository
  implements ExpenseRepository, ExpenseInvoiceRepository
{
  readonly records: Omit<ExpenseRecord, 'invoice'>[] = [];
  readonly invoices: StoredInvoice[] = [];
  readonly nicknames = new Map<string, string>();
  private nextInvoiceId = 101;

  async create(
    closingId: number,
    createdById: number,
    data: ExpenseData,
    invoice: AttachedInvoice | null,
  ): Promise<ExpenseRecord> {
    const id = this.records.length + 1;
    this.records.push({ id, closingId, createdById, ...data });
    if (invoice) this.storeInvoice(id, invoice);
    return this.withInvoice(id);
  }

  async findById(id: number): Promise<ExpenseRecord | null> {
    return this.records.some((r) => r.id === id) ? this.withInvoice(id) : null;
  }

  async update(
    id: number,
    data: ExpenseData,
    change: ExpenseInvoiceChange,
  ): Promise<ExpenseRecord> {
    const index = this.records.findIndex((r) => r.id === id);
    this.records[index] = { ...this.records[index], ...data };
    if (change.kind !== 'keep') this.dropInvoice(id);
    if (change.kind === 'attach') this.storeInvoice(id, change);
    const kept = this.invoices.find((s) => s.expenseId === id);
    if (change.kind === 'keep' && change.outsidePositions && kept)
      kept.outside = new Set(change.outsidePositions);
    return this.withInvoice(id);
  }

  async delete(id: number): Promise<void> {
    this.records.splice(
      this.records.findIndex((r) => r.id === id),
      1,
    );
    this.dropInvoice(id);
  }

  async listByClosing(closingId: number): Promise<ExpenseRecord[]> {
    return this.records
      .filter((r) => r.closingId === closingId)
      .map((r) => this.withInvoice(r.id));
  }

  async findUseByKey(accessKey: string): Promise<InvoiceUse | null> {
    const stored = this.invoices.find((s) => s.invoice.accessKey === accessKey);
    if (!stored) return null;
    const expense = this.records.find((r) => r.id === stored.expenseId);
    return {
      expenseId: stored.expenseId,
      businessDate: closingDate(expense?.closingId ?? 0),
    };
  }

  async findDetail(id: number): Promise<ExpenseInvoiceDetail | null> {
    const stored = this.invoices.find((s) => s.id === id);
    const expense = this.records.find((r) => r.id === stored?.expenseId);
    if (!stored || !expense) return null;
    const { accessKey, issuerName, issuedAt, items, ...rest } = stored.invoice;
    return {
      ...rest,
      id,
      accessKey,
      vendorName: this.vendorName(stored.invoice),
      legalName: issuerName,
      issuedAt: issuedAt.toISOString(),
      items: items.map((item) => ({
        ...item,
        outsideBusiness: stored.outside.has(item.position),
      })),
      expenseId: expense.id,
      expenseAmount: expense.amount,
      closingId: expense.closingId,
    };
  }

  async findVendorNickname(cnpjRoot: string): Promise<string | null> {
    return this.nicknames.get(cnpjRoot) ?? null;
  }

  async findLastSuggestion(
    cnpjRoot: string,
  ): Promise<InvoiceSuggestion | null> {
    const last = this.invoices
      .filter((s) => cnpjRootOf(s.invoice.issuerCnpj) === cnpjRoot)
      .at(-1);
    const expense = this.records.find((r) => r.id === last?.expenseId);
    if (!expense) return null;
    return {
      expenseTypeId: expense.expenseTypeId,
      description: expense.description,
    };
  }

  /** Como o Prisma: da nota mais nova (emissão) para a mais antiga; as linhas na ordem da nota. */
  async findOutsideDecisions(
    cnpjRoot: string,
    codes: string[],
  ): Promise<OutsideDecision[]> {
    return this.invoices
      .filter((s) => cnpjRootOf(s.invoice.issuerCnpj) === cnpjRoot)
      .sort(
        (a, b) => b.invoice.issuedAt.getTime() - a.invoice.issuedAt.getTime(),
      )
      .flatMap((s) =>
        s.invoice.items
          .filter((item) => codes.includes(item.code))
          .map((item) => ({
            code: item.code,
            outsideBusiness: s.outside.has(item.position),
          })),
      );
  }

  private storeInvoice(
    expenseId: number,
    { invoice, outsidePositions }: AttachedInvoice,
  ): void {
    this.invoices.push({
      id: this.nextInvoiceId++,
      expenseId,
      invoice,
      outside: new Set(outsidePositions),
    });
  }

  private dropInvoice(expenseId: number): void {
    const index = this.invoices.findIndex((s) => s.expenseId === expenseId);
    if (index >= 0) this.invoices.splice(index, 1);
  }

  private vendorName(invoice: NfceInvoice): string {
    const nickname = this.nicknames.get(cnpjRootOf(invoice.issuerCnpj));
    return vendorDisplayName({
      nickname: nickname ?? null,
      legalName: invoice.issuerName,
    });
  }

  private withInvoice(id: number): ExpenseRecord {
    const record = this.records.find((r) => r.id === id);
    if (!record) throw new Error(`FakeExpenseRepository sem o gasto ${id}`);
    const stored = this.invoices.find((s) => s.expenseId === id);
    const invoice = stored && {
      id: stored.id,
      vendorName: this.vendorName(stored.invoice),
      issuedAt: stored.invoice.issuedAt.toISOString(),
      itemCount: stored.invoice.items.length,
      outsideItemCount: stored.outside.size,
      outsideTotal: outsideTotalOf(stored),
      amountDue: stored.invoice.amountDue,
    };
    return { ...record, invoice: invoice ?? null };
  }
}

export class FakeExpenseTypeRepository implements ExpenseTypeRepository {
  readonly records: ExpenseTypeRecord[] = [
    { id: 1, name: 'Gás', nameKey: 'gas', active: true },
    { id: 2, name: 'Velho', nameKey: 'velho', active: false },
    { id: 3, name: 'Mercado', nameKey: 'mercado', active: true },
  ];

  async list(): Promise<ExpenseTypeRecord[]> {
    return this.records;
  }

  async findById(id: number): Promise<ExpenseTypeRecord | null> {
    return this.records.find((r) => r.id === id) ?? null;
  }

  async create(data: ExpenseTypeData): Promise<ExpenseTypeRecord> {
    throw new Error(`não usado neste teste: ${data.name}`);
  }

  async update(id: number): Promise<ExpenseTypeRecord> {
    throw new Error(`não usado neste teste: ${id}`);
  }
}

/** Soma das linhas de fora da nota guardada, como o Prisma (centavos, sem float). */
function outsideTotalOf(stored: StoredInvoice): string {
  const cents = stored.invoice.items
    .filter((item) => stored.outside.has(item.position))
    .reduce((sum, item) => sum + toCents(item.total), 0);
  return formatCents(cents);
}

/** Noite do fechamento: o de hoje (id 10) é 22/09; qualquer outro, um dia antigo. */
function closingDate(closingId: number): string {
  return closingId === TODAY_CLOSING_ID ? '2026-09-22' : '2026-08-01';
}

export class FakeClosingLookup implements ClosingLookup {
  today: ClosingRecord = {
    id: TODAY_CLOSING_ID,
    businessDate: closingDate(TODAY_CLOSING_ID),
    status: 'OPEN',
    motoboyDailyRate: '40.00',
    closedById: null,
    closedAt: null,
    reopenedById: null,
    reopenedAt: null,
    notes: null,
  };

  askedDates: (string | undefined)[] = [];

  async getFor(_user: SessionUser, rawDate?: string): Promise<ClosingRecord> {
    this.askedDates.push(rawDate);
    return this.today;
  }

  async getOrCreateFor(
    _user: SessionUser,
    rawDate?: string,
  ): Promise<ClosingRecord> {
    this.askedDates.push(rawDate);
    return this.today;
  }

  /** Id diferente do de hoje = fechamento antigo, fora da noite em andamento do caixa. */
  async getById(id: number): Promise<ClosingRecord> {
    if (id === this.today.id) return this.today;
    return { ...this.today, id, businessDate: closingDate(id) };
  }

  assertEditable(user: SessionUser, closing: ClosingRecord): void {
    assertCanEditClosing(user, closing, [this.today.businessDate]);
  }

  assertViewable(user: SessionUser, closing: ClosingRecord): void {
    assertCanSelectDate(user, closing.businessDate, [this.today.businessDate]);
  }

  async getByDate(): Promise<ClosingRecord> {
    return this.today;
  }
}

/** Leitor de nota do gasto com a SEFAZ de mentira e o repositório fake. */
export function buildInvoiceReader(
  repo: FakeExpenseRepository,
  pages: FakeNfcePageSource,
): ExpenseInvoiceReader {
  return new ExpenseInvoiceReader(new NfceReaderService(pages), repo);
}
