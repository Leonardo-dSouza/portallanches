import type { NfceItem } from '../nfce/nfce-invoice.js';

export const EXPENSE_INVOICE_REPOSITORY = Symbol('EXPENSE_INVOICE_REPOSITORY');

/** Gasto que já usa a nota, para o aviso "Essa nota já está no gasto #12 (noite de 18/10)". */
export interface InvoiceUse {
  expenseId: number;
  /** Noite do gasto (YYYY-MM-DD). */
  businessDate: string;
}

/** Tipo e observação do último gasto com nota do mesmo mercado. */
export interface InvoiceSuggestion {
  expenseTypeId: number;
  description: string | null;
}

/** Nota presa a um gasto, com os itens, para a janela "Ver itens". */
export interface ExpenseInvoiceDetail {
  id: number;
  accessKey: string;
  vendorName: string;
  legalName: string;
  issuerCnpj: string;
  number: number;
  series: number;
  issuedAt: string;
  itemsTotal: string;
  discount: string;
  amountDue: string;
  paymentLabel: string | null;
  items: NfceItem[];
  expenseId: number;
  /** Valor lançado no gasto (pode diferir do "a pagar" da nota). */
  expenseAmount: string;
  closingId: number;
}

export interface ExpenseInvoiceRepository {
  findUseByKey(accessKey: string): Promise<InvoiceUse | null>;
  findDetail(id: number): Promise<ExpenseInvoiceDetail | null>;
  /** Apelido do mercado pela raiz do CNPJ (8 números); null sem apelido ou mercado novo. */
  findVendorNickname(cnpjRoot: string): Promise<string | null>;
  findLastSuggestion(cnpjRoot: string): Promise<InvoiceSuggestion | null>;
}
