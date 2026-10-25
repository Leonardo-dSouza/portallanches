/** Período de Compras pela data de emissão da nota (dia de SP), já como instantes. */
export interface IssuedRange {
  /** Início do primeiro dia (inclusivo). */
  from: Date;
  /** Início do dia seguinte ao último (exclusivo). */
  until: Date;
}

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
  /** Itens fora da lanchonete (2026-10-25): "20 itens · 3 fora". */
  outsideItemCount: number;
  amountDue: string;
  /** Valor lançado no gasto (pode diferir do "a pagar"). */
  expenseAmount: string;
  /** Noite do caixa em que o gasto foi lançado (YYYY-MM-DD). */
  businessDate: string;
}

/** Uma linha de nota com o preço, para o resumo de preços. */
export interface ItemPriceRow {
  vendorId: number;
  vendorName: string;
  code: string;
  description: string;
  unit: string;
  unitPrice: string;
  invoiceId: number;
  position: number;
  issuedAt: Date;
}

/** Produto de um mercado (mercado + código) na aba Compras → Preços. */
export interface ProductPriceSummary {
  vendorId: number;
  vendorName: string;
  code: string;
  /** Descrição e unidade da última compra. */
  description: string;
  unit: string;
  lastPrice: string;
  lastPurchasedAt: string;
  /** Preço na nota anterior à última; null com uma compra só. */
  previousPrice: string | null;
  minPrice: string;
  maxPrice: string;
  /** Notas em que o produto aparece (linhas repetidas da mesma nota contam uma vez). */
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
  total: string;
}

/** Mercado na aba Compras → Mercados, com as notas do período. */
export interface VendorSummary {
  id: number;
  cnpjRoot: string;
  legalName: string;
  nickname: string | null;
  invoiceCount: number;
  /** Soma do "a pagar" das notas do período, menos os itens fora da lanchonete (2026-10-25). */
  total: string;
}

/** A nota e o gasto dela, para trocar os itens de fora em Compras (2026-10-25). */
export interface OutsideSnapshot {
  invoiceId: number;
  expenseId: number;
  /** Valor lançado no gasto agora. */
  expenseAmount: string;
  items: { position: number; total: string; outsideBusiness: boolean }[];
}

/** O que gravar: as marcas novas e o valor do gasto, se ele ainda for o lido antes. */
export interface OutsideItemsChange {
  invoiceId: number;
  expenseId: number;
  positions: number[];
  previousAmount: string;
  expenseAmount: string;
}

/** Resposta de trocar os itens de fora: o gasto com o valor novo. */
export interface OutsideItemsResult {
  invoiceId: number;
  expenseId: number;
  expenseAmount: string;
  outsideItemCount: number;
}
