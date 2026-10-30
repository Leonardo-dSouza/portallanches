import {
  ConflictException,
  Inject,
  Injectable,
  UnprocessableEntityException,
} from '@nestjs/common';
import { parseNfceCode } from '../nfce/nfce-access-key.js';
import type { NfceInvoice } from '../nfce/nfce-invoice.js';
import { NfceReaderService } from '../nfce/nfce-reader.service.js';
import type { InvoiceSource } from './expense-input.js';
import {
  EXPENSE_INVOICE_REPOSITORY,
  type ExpenseInvoiceRepository,
  type InvoiceUse,
} from './expense-invoice-repository.js';

/**
 * Lê a nota para um gasto, da consulta ou do HTML salvo, e garante que ela não está em outro
 * (409). A repetida é barrada antes de consultar a SEFAZ; `ownExpenseId` é o gasto em edição,
 * cuja nota não conta.
 *
 * @example await reader.readUnused({ kind: 'code', code: 'https://…/qrcode?p=3526…' }, null)
 */
@Injectable()
export class ExpenseInvoiceReader {
  constructor(
    @Inject(NfceReaderService) private readonly nfce: NfceReaderService,
    @Inject(EXPENSE_INVOICE_REPOSITORY)
    private readonly invoices: ExpenseInvoiceRepository,
  ) {}

  async readUnused(
    source: InvoiceSource,
    ownExpenseId: number | null,
  ): Promise<NfceInvoice> {
    if (source.kind === 'page') return this.readPage(source, ownExpenseId);
    const { accessKey } = parseNfceCode(source.code);
    await this.assertUnused(accessKey, ownExpenseId);
    return this.nfce.read(source.code);
  }

  private async readPage(
    source: Extract<InvoiceSource, { kind: 'page' }>,
    ownExpenseId: number | null,
  ): Promise<NfceInvoice> {
    const invoice = this.nfce.readSavedPage(source.html);
    assertSameInvoice(invoice.accessKey, source.expectedCode);
    await this.assertUnused(invoice.accessKey, ownExpenseId);
    return invoice;
  }

  private async assertUnused(
    accessKey: string,
    ownExpenseId: number | null,
  ): Promise<void> {
    const use = await this.invoices.findUseByKey(accessKey);
    if (use && use.expenseId !== ownExpenseId) throw alreadyUsed(use);
  }
}

function assertSameInvoice(key: string, expectedCode: string | null): void {
  if (expectedCode === null) return;
  const expected = parseNfceCode(expectedCode).accessKey;
  if (key === expected) return;
  throw new UnprocessableEntityException(
    `O arquivo é da nota ${key}, esperado a nota ${expected}: importe o arquivo de novo`,
  );
}

function alreadyUsed(use: InvoiceUse): ConflictException {
  const [, month, day] = use.businessDate.split('-');
  return new ConflictException(
    `Essa nota já está no gasto #${use.expenseId} (noite de ${day}/${month})`,
  );
}
