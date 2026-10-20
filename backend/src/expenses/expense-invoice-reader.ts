import { ConflictException, Inject, Injectable } from '@nestjs/common';
import { parseNfceCode } from '../nfce/nfce-access-key.js';
import type { NfceInvoice } from '../nfce/nfce-invoice.js';
import { NfceReaderService } from '../nfce/nfce-reader.service.js';
import {
  EXPENSE_INVOICE_REPOSITORY,
  type ExpenseInvoiceRepository,
  type InvoiceUse,
} from './expense-invoice-repository.js';

/**
 * Lê a nota para um gasto e garante que ela não está em outro (409). A repetida é barrada
 * antes de consultar a SEFAZ; `ownExpenseId` é o gasto em edição, cuja nota não conta.
 *
 * @example await reader.readUnused('https://…/qrcode?p=3526…', null)
 */
@Injectable()
export class ExpenseInvoiceReader {
  constructor(
    @Inject(NfceReaderService) private readonly nfce: NfceReaderService,
    @Inject(EXPENSE_INVOICE_REPOSITORY)
    private readonly invoices: ExpenseInvoiceRepository,
  ) {}

  async readUnused(
    code: string,
    ownExpenseId: number | null,
  ): Promise<NfceInvoice> {
    const { accessKey } = parseNfceCode(code);
    const use = await this.invoices.findUseByKey(accessKey);
    if (use && use.expenseId !== ownExpenseId) throw alreadyUsed(use);
    return this.nfce.read(code);
  }
}

function alreadyUsed(use: InvoiceUse): ConflictException {
  const [, month, day] = use.businessDate.split('-');
  return new ConflictException(
    `Essa nota já está no gasto #${use.expenseId} (noite de ${day}/${month})`,
  );
}
