import type { Money } from './types';

/** Resumo da nota presa ao gasto, como vem na lista de gastos. */
export interface ExpenseInvoiceSummary {
  id: number;
  /** Apelido do mercado ou, sem apelido, a razão social. */
  vendorName: string;
  issuedAt: string;
  itemCount: number;
  amountDue: Money;
}

/** Linha da nota como a SEFAZ mostra; quantidade e preço em texto da API ('1.248', '19.9'). */
export interface InvoiceItem {
  position: number;
  code: string;
  description: string;
  quantity: string;
  unit: string;
  unitPrice: string;
  total: Money;
}

/** Campos da nota que a janela "Ver itens" mostra, venha ela da prévia ou de um gasto salvo. */
export interface InvoiceView {
  accessKey: string;
  vendorName: string;
  legalName: string;
  issuerCnpj: string;
  number: number;
  series: number;
  issuedAt: string;
  itemsTotal: Money;
  discount: Money;
  amountDue: Money;
  paymentLabel: string | null;
  items: InvoiceItem[];
  /** Valor lançado no gasto; null na prévia, antes de salvar. */
  expenseAmount: Money | null;
}

/** Nota lida na SEFAZ (`POST /expense-invoices/preview`). */
export interface NfceInvoice {
  accessKey: string;
  issuerName: string;
  issuerCnpj: string;
  number: number;
  series: number;
  issuedAt: string;
  itemsTotal: Money;
  discount: Money;
  amountDue: Money;
  paymentLabel: string | null;
  items: InvoiceItem[];
}

export interface InvoiceSuggestion {
  expenseTypeId: number;
  description: string | null;
}

export interface InvoicePreview {
  invoice: NfceInvoice;
  vendorName: string;
  suggestion: InvoiceSuggestion | null;
}

/** Nota de um gasto salvo (`GET /expense-invoices/:id`). */
export interface ExpenseInvoiceDetail extends Omit<
  InvoiceView,
  'expenseAmount'
> {
  id: number;
  expenseId: number;
  expenseAmount: Money;
  closingId: number;
}
