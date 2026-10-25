import type { Money } from './types';

/** Nota na aba Compras → Notas. */
export interface PurchaseInvoiceRow {
  id: number;
  expenseId: number;
  vendorId: number;
  vendorName: string;
  number: number;
  series: number;
  issuedAt: string;
  itemCount: number;
  /** Itens fora da lanchonete (2026-10-25). */
  outsideItemCount: number;
  amountDue: Money;
  /** Valor lançado no gasto (pode diferir do "a pagar"). */
  expenseAmount: Money;
  /** Noite do caixa em que o gasto foi lançado (YYYY-MM-DD). */
  businessDate: string;
}

/** Produto de um mercado (mercado + código) na aba Compras → Preços. */
export interface ProductPriceSummary {
  vendorId: number;
  vendorName: string;
  code: string;
  description: string;
  unit: string;
  /** Preços com até 4 casas, em texto da API ('19.9'). */
  lastPrice: string;
  lastPurchasedAt: string;
  previousPrice: string | null;
  minPrice: string;
  maxPrice: string;
  purchaseCount: number;
}

/** Uma compra do produto, no histórico. */
export interface ProductPurchase {
  invoiceId: number;
  invoiceNumber: number;
  issuedAt: string;
  description: string;
  quantity: string;
  unit: string;
  unitPrice: string;
  total: Money;
}

/** Mercado na aba Compras → Mercados, com as notas do período. */
export interface VendorSummary {
  id: number;
  cnpjRoot: string;
  legalName: string;
  nickname: string | null;
  invoiceCount: number;
  total: Money;
}

/** Resposta de marcar os itens de fora em Compras: o gasto daquela noite com o valor novo. */
export interface OutsideItemsResult {
  invoiceId: number;
  expenseId: number;
  expenseAmount: Money;
  outsideItemCount: number;
}

/** Produto pelo mercado e pelo código da nota. */
export interface ProductKey {
  vendorId: number;
  code: string;
}
