import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { SessionUser } from '../auth/session-user.js';
import {
  CLOSING_LOOKUP,
  type ClosingLookup,
} from '../closing/closing-lookup.js';
import type { NfceInvoice } from '../nfce/nfce-invoice.js';
import { parseInvoicePreviewInput } from './expense-input.js';
import { ExpenseInvoiceReader } from './expense-invoice-reader.js';
import {
  latestOutsideCodes,
  suggestedOutsidePositions,
} from './outside-items.js';
import { cnpjRootOf, vendorDisplayName } from './vendor-display.js';
import {
  EXPENSE_INVOICE_REPOSITORY,
  type ExpenseInvoiceDetail,
  type ExpenseInvoiceRepository,
  type InvoiceSuggestion,
} from './expense-invoice-repository.js';

/** Nota lida antes de salvar o gasto, com o nome do mercado e a sugestão de tipo/observação. */
export interface InvoicePreview {
  invoice: NfceInvoice;
  vendorName: string;
  suggestion: InvoiceSuggestion | null;
  /** Itens que a nota mais recente do mercado marcou como fora da lanchonete (2026-10-25). */
  outsidePositions: number[];
}

@Injectable()
export class ExpenseInvoiceService {
  constructor(
    @Inject(ExpenseInvoiceReader) private readonly reader: ExpenseInvoiceReader,
    @Inject(EXPENSE_INVOICE_REPOSITORY)
    private readonly invoices: ExpenseInvoiceRepository,
    @Inject(CLOSING_LOOKUP) private readonly closings: ClosingLookup,
  ) {}

  /**
   * Lê a nota, na SEFAZ ou no HTML salvo, para o caixa conferir antes de salvar o gasto.
   *
   * @example await service.preview({ code: 'https://…/qrcode?p=3526…' })
   */
  async preview(body: unknown): Promise<InvoicePreview> {
    const { source, expenseId } = parseInvoicePreviewInput(body);
    const invoice = await this.reader.readUnused(source, expenseId);
    const cnpjRoot = cnpjRootOf(invoice.issuerCnpj);
    const codes = invoice.items.map((item) => item.code);
    const [nickname, suggestion, decisions] = await Promise.all([
      this.invoices.findVendorNickname(cnpjRoot),
      this.invoices.findLastSuggestion(cnpjRoot),
      this.invoices.findOutsideDecisions(cnpjRoot, codes),
    ]);
    const vendorName = vendorDisplayName({
      nickname,
      legalName: invoice.issuerName,
    });
    const outsidePositions = suggestedOutsidePositions(
      invoice.items,
      latestOutsideCodes(decisions),
    );
    return { invoice, vendorName, suggestion, outsidePositions };
  }

  /** Nota de um gasto com os itens; o caixa só vê as da noite em andamento. */
  async detail(user: SessionUser, id: number): Promise<ExpenseInvoiceDetail> {
    const detail = await this.invoices.findDetail(id);
    if (!detail)
      throw new NotFoundException(`Nota fiscal ${id} não encontrada`);
    const closing = await this.closings.getById(detail.closingId);
    this.closings.assertViewable(user, closing);
    return detail;
  }
}
