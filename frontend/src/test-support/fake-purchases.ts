import { ApiError, type HttpMethod } from '../api/api-client';
import type {
  ProductPriceSummary,
  ProductPurchase,
  PurchaseInvoiceRow,
  VendorSummary,
} from '../api/purchase-types';

/** O que a aba Compras do fake devolve (o backend é quem filtra o período e agrega). */
export class FakePurchaseData {
  invoices: PurchaseInvoiceRow[] = [];
  products: ProductPriceSummary[] = [];
  /** Histórico por produto, na chave `vendorId|código`. */
  history: Record<string, ProductPurchase[]> = {};
  vendors: VendorSummary[] = [];
}

function renamed(
  data: FakePurchaseData,
  id: number,
  body: Record<string, unknown>,
): VendorSummary {
  const vendor = data.vendors.find((v) => v.id === id);
  if (!vendor)
    throw new ApiError(404, 'Registro não encontrado para a operação pedida');
  const updated = {
    ...vendor,
    nickname: (body.nickname as string | null) ?? null,
  };
  data.vendors = data.vendors.map((v) => (v.id === id ? updated : v));
  return updated;
}

/**
 * `/purchases/*` do fake, como o backend: notas, preços, histórico do produto e mercados.
 *
 * @example fakePurchaseRoute(api.purchases, 'GET', '/purchases/products', 'from=…&to=…', {})
 */
export function fakePurchaseRoute(
  data: FakePurchaseData,
  method: HttpMethod,
  path: string,
  query: string,
  body: Record<string, unknown>,
): unknown {
  if (method === 'PUT') return renamed(data, Number(path.split('/')[3]), body);
  if (path === '/purchases/invoices') return data.invoices;
  if (path === '/purchases/products') return data.products;
  if (path === '/purchases/vendors') return data.vendors;
  const params = new URLSearchParams(query);
  return data.history[`${params.get('vendorId')}|${params.get('code')}`] ?? [];
}
