import type { Money } from './types';

/** Ligação de item da nota fiscal a um insumo do estoque. */
export interface ItemSupplyLink {
  supplyId: number;
  supplyName: string;
  baseQuantity: string;
  label: string | null;
  /** Produto com a marca ("Bacon Seara kg"); null = ligação antiga. */
  productName: string | null;
  /** Insumo com baixa na venda: só ele entra pelo "Lançar no estoque" (pedido do dono, 19/11). */
  deductOnSale: boolean;
}

/** Produto com a marca já usado num insumo (`GET /purchases/item-links/products`). */
export interface LinkProduct {
  supplyId: number;
  productName: string;
}

/** Alerta de preço pago em comparação com o custo base do insumo. */
export interface PriceAlert {
  paidPerUnit: string;
  basePerUnit: string;
  diffPercent: string;
  above: boolean;
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
  total: Money;
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
  /** Itens fora da lanchonete (2026-10-25). */
  outsideItemCount: number;
  /** Itens da lanchonete cujo preço unitário pago passou da base na data da nota. */
  aboveBaseCount: number;
  amountDue: Money;
  /** Valor lançado no gasto (pode diferir do "a pagar"). */
  expenseAmount: Money;
  /** Noite do caixa em que o gasto foi lançado (YYYY-MM-DD). */
  businessDate: string;
  /** Instante ISO em que a nota teve seus itens lançados no estoque; null se ainda não lançada. */
  stockEnteredAt?: string | null;
  /** Nome do usuário admin que lançou a nota no estoque; null se ainda não lançada. */
  stockEnteredByName?: string | null;
  items?: PurchaseInvoiceItemRow[];
}

/** Item escolhido para lançamento no estoque com validade opcional. */
export interface InvoiceStockEntryItemInput {
  itemId: number;
  expiresOn: string | null;
}

/** Dados enviados para `POST /purchases/invoices/:id/stock-entry`. */
export interface InvoiceStockEntryInput {
  items: InvoiceStockEntryItemInput[];
}

/** Dados para vincular um item da nota fiscal a um insumo do estoque. */
export interface ItemLinkInput {
  vendorId: number;
  code: string;
  supplyId: number;
  baseQuantity: string;
  label: string | null;
  /** Produto com a marca: junta o mesmo produto de mercados diferentes no insumo. */
  productName: string;
}

/** Uma compra no histórico de preços do insumo (`GET /purchases/supplies/:id/prices`). */
export interface SupplyPriceRecord {
  invoiceId: number;
  issuedAt: string;
  vendorName: string;
  /** Produto com a marca da ligação; a descrição da nota na ligação antiga. */
  productName: string;
  description: string;
  quantity: string;
  unit: string;
  unitPrice: string;
  label: string | null;
  baseQuantity: string;
  paidPerUnit: string;
  /** null = o insumo não tinha custo base na data da nota (sem comparação). */
  basePerUnit: string | null;
  diffPercent: string | null;
  above: boolean;
}

/** Último preço pago de um insumo nas compras (`GET /purchases/supplies/last-prices`). */
export interface SupplyLastPrice {
  issuedAt: string;
  vendorName: string;
  paidPerUnit: string;
  /** null = o insumo não tinha custo base na data da nota. */
  diffPercent: string | null;
  above: boolean;
}

export type SupplyLastPricesMap = Record<number, SupplyLastPrice>;

/** Insumo e produto com a marca de um item ligado (Preços → Por produto). */
export interface ProductLinkTag {
  supplyName: string;
  /** null = ligação antiga, sem produto. */
  productName: string | null;
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
  /** A que insumo e produto o item está ligado; null = sem insumo. */
  link: ProductLinkTag | null;
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

/** Um preço no quadro Por insumo: produto, mercado, pago por unidade do insumo e a data. */
export interface BoardPrice {
  productName: string;
  vendorName: string;
  paidPerUnit: string;
  issuedAt: string;
}

/** Último preço de um produto num mercado; `cheapest` = o mais barato da marca. */
export interface BoardMarket {
  vendorName: string;
  paidPerUnit: string;
  issuedAt: string;
  purchaseCount: number;
  cheapest: boolean;
}

/** Uma marca do insumo com os mercados, do mais barato ao mais caro. */
export interface BoardProduct {
  productName: string;
  markets: BoardMarket[];
}

/** Linha do quadro Compras → Preços → Por insumo (`GET /purchases/supplies/price-board`). */
export interface SupplyPriceBoardRow {
  supplyId: number;
  supplyName: string;
  countUnit: string;
  last: BoardPrice;
  cheapest: BoardPrice;
  /** Gasto no período, 2 casas. */
  spent: string;
  purchaseCount: number;
  products: BoardProduct[];
}
