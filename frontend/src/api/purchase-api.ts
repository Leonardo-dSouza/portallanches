import type { ApiClient } from './api-client';
import type {
  InvoiceStockEntryInput,
  ItemLinkInput,
  OutsideItemsResult,
  ProductKey,
  ProductPriceSummary,
  ProductPurchase,
  PurchaseInvoiceRow,
  SupplyLastPricesMap,
  SupplyPriceRecord,
  VendorSummary,
} from './purchase-types';
import type { DateRange } from './types';

/** Aba Compras (só admin): tudo pelo período da emissão da nota e ligações a insumos. */
export interface PurchaseApi {
  invoices(range: DateRange): Promise<PurchaseInvoiceRow[]>;
  products(range: DateRange): Promise<ProductPriceSummary[]>;
  productHistory(
    product: ProductKey,
    range: DateRange,
  ): Promise<ProductPurchase[]>;
  vendors(range: DateRange): Promise<VendorSummary[]>;
  /** null tira o apelido. */
  renameVendor(id: number, nickname: string | null): Promise<unknown>;
  /** Itens da nota fora da lanchonete (2026-10-25) e desconto (2026-11-08); o gasto da noite é recalculado. */
  markOutsideItems(
    invoiceId: number,
    positions: number[],
    businessDiscount?: string,
  ): Promise<OutsideItemsResult>;
  /** Liga ou substitui a ligação de item da nota fiscal a um insumo do estoque. */
  saveItemLink(link: ItemLinkInput): Promise<unknown>;
  /** Remove a ligação de um item da nota fiscal ao estoque. */
  deleteItemLink(vendorId: number, code: string): Promise<void>;
  /** Histórico de preços pagos nas compras ligadas a um insumo. */
  supplyPrices(supplyId: number): Promise<SupplyPriceRecord[]>;
  /** Último preço pago de cada insumo com compra ligada. */
  lastPrices(): Promise<SupplyLastPricesMap>;
  /** Lança os itens escolhidos da nota fiscal como lotes no estoque. */
  enterStock(invoiceId: number, body: InvoiceStockEntryInput): Promise<unknown>;
}

const periodQuery = ({ from, to }: DateRange) => `from=${from}&to=${to}`;

/** @example await createPurchaseApi(api).products({ from: '2026-10-01', to: '2026-10-31' }) */
export function createPurchaseApi(api: ApiClient): PurchaseApi {
  return {
    invoices: (range) =>
      api.request('GET', `/purchases/invoices?${periodQuery(range)}`),
    products: (range) =>
      api.request('GET', `/purchases/products?${periodQuery(range)}`),
    productHistory: ({ vendorId, code }, range) => {
      const product = new URLSearchParams({ vendorId: String(vendorId), code });
      return api.request(
        'GET',
        `/purchases/products/history?${product}&${periodQuery(range)}`,
      );
    },
    vendors: (range) =>
      api.request('GET', `/purchases/vendors?${periodQuery(range)}`),
    renameVendor: (id, nickname) =>
      api.request('PUT', `/purchases/vendors/${id}`, { nickname }),
    markOutsideItems: (invoiceId, positions, businessDiscount) =>
      api.request('PUT', `/purchases/invoices/${invoiceId}/outside-items`, {
        positions,
        ...(businessDiscount !== undefined ? { businessDiscount } : {}),
      }),
    saveItemLink: (link) => api.request('PUT', '/purchases/item-links', link),
    deleteItemLink: (vendorId, code) =>
      api.request('DELETE', `/purchases/item-links/${vendorId}/${code}`),
    supplyPrices: (supplyId) =>
      api.request('GET', `/purchases/supplies/${supplyId}/prices`),
    lastPrices: () => api.request('GET', '/purchases/supplies/last-prices'),
    enterStock: (invoiceId, body) =>
      api.request('POST', `/purchases/invoices/${invoiceId}/stock-entry`, body),
  };
}
