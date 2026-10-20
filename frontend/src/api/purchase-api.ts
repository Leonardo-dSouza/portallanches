import type { ApiClient } from './api-client';
import type {
  ProductKey,
  ProductPriceSummary,
  ProductPurchase,
  PurchaseInvoiceRow,
  VendorSummary,
} from './purchase-types';
import type { DateRange } from './types';

/** Aba Compras (só admin): tudo pelo período da emissão da nota. */
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
  };
}
