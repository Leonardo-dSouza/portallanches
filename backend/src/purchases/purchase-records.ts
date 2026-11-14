import type { LinkedInvoiceItem } from './invoice-stock-entry.js';
import type { PriceAlert } from './price-alert.js';

/** Período de Compras pela data de emissão da nota (dia de SP), já como instantes. */
export interface IssuedRange {
  /** Início do primeiro dia (inclusivo). */
  from: Date;
  /** Início do dia seguinte ao último (exclusivo). */
  until: Date;
}

/** Ligação de item da nota fiscal a um insumo do estoque. */
export interface ItemSupplyLink {
  supplyId: number;
  supplyName: string;
  baseQuantity: string;
  label: string | null;
}

/** Registro de ligação persistido no banco de dados. */
export interface ItemLinkRecord {
  id: number;
  vendorId: number;
  code: string;
  supplyId: number;
  baseQuantity: string;
  label: string | null;
}

/** Linha de item de nota fiscal com a ligação ao insumo e o alerta de preço. */
export interface PurchaseInvoiceItemRow {
  /** Id do item: a entrada no estoque pela nota escolhe os itens por ele. */
  id: number;
  position: number;
  code: string;
  description: string;
  quantity: string;
  unit: string;
  unitPrice: string;
  total: string;
  outsideBusiness: boolean;
  link: ItemSupplyLink | null;
  alert: PriceAlert | null;
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
  /** Itens da lanchonete cujo preço unitário pago passou da base na data da nota. */
  aboveBaseCount: number;
  amountDue: string;
  /** Valor lançado no gasto (pode diferir do "a pagar"). */
  expenseAmount: string;
  /** Noite do caixa em que o gasto foi lançado (YYYY-MM-DD). */
  businessDate: string;
  /** Instante ISO em que a nota teve seus itens lançados no estoque; null se ainda não lançada. */
  stockEnteredAt: string | null;
  /** Nome do usuário admin que lançou a nota no estoque; null se ainda não lançada. */
  stockEnteredByName: string | null;
  items: PurchaseInvoiceItemRow[];
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
  discount: string;
  businessDiscount: string;
  items: { position: number; total: string; outsideBusiness: boolean }[];
}

/** O que gravar: as marcas novas, o desconto da lanchonete e o valor do gasto, se ele ainda for o lido antes. */
export interface OutsideItemsChange {
  invoiceId: number;
  expenseId: number;
  positions: number[];
  businessDiscount: string;
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

/** Uma compra ligada a um insumo do estoque, para o histórico de preços do insumo. */
export interface SupplyPriceRow {
  invoiceId: number;
  issuedAt: string;
  vendorName: string;
  description: string;
  quantity: string;
  unit: string;
  unitPrice: string;
  label: string | null;
  baseQuantity: string;
  paidPerUnit: string;
  /** Base do insumo na data da nota; null = o insumo não tinha custo base (sem comparação). */
  basePerUnit: string | null;
  diffPercent: string | null;
  above: boolean;
}

/** Preço e variação da compra mais recente de um insumo. */
export interface SupplyLastPrice {
  issuedAt: string;
  vendorName: string;
  paidPerUnit: string;
  /** null = o insumo não tinha custo base na data da nota. */
  diffPercent: string | null;
  above: boolean;
}

/** Mapa da última compra ligada de cada insumo indexado pelo supplyId. */
export type SupplyLastPricesMap = Record<number, SupplyLastPrice>;

/** Dados da nota necessários para planejar e validar a entrada no estoque. */
export interface InvoiceStockTarget {
  id: number;
  issuedAt: Date;
  stockEnteredAt: Date | null;
  items: LinkedInvoiceItem[];
}
