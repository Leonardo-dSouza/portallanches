import { ApiError, type HttpMethod } from '../api/api-client';
import type { ExpenseInvoiceDetail } from '../api/invoice-types';
import { centsToMoney, moneyToCents } from '../api/money';
import type {
  OutsideItemsResult,
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

const outsideCents = (detail: ExpenseInvoiceDetail, outside: Set<number>) =>
  detail.items
    .filter((item) => outside.has(item.position))
    .reduce((sum, item) => sum + moneyToCents(item.total), 0);

/**
 * Marcar os itens de fora em Compras, como o backend: troca as marcas da nota e recalcula o
 * gasto pela diferença (2026-10-25).
 */
function markedOutside(
  details: Record<number, ExpenseInvoiceDetail>,
  invoiceId: number,
  body: Record<string, unknown>,
): OutsideItemsResult {
  const detail = details[invoiceId];
  if (!detail)
    throw new ApiError(404, `Nota fiscal ${invoiceId} não encontrada`);
  const next = new Set(body.positions as number[]);
  const before = new Set(
    detail.items.filter((i) => i.outsideBusiness).map((i) => i.position),
  );
  const cents =
    moneyToCents(detail.expenseAmount) +
    outsideCents(detail, before) -
    outsideCents(detail, next);
  if (cents <= 0)
    throw new ApiError(
      422,
      `O gasto #${detail.expenseId} ficaria com R$ ${(cents / 100).toFixed(2)}: esperado valor maior que zero; ajuste o gasto no Caixa antes`,
    );
  const expenseAmount = centsToMoney(cents);
  details[invoiceId] = {
    ...detail,
    expenseAmount,
    items: detail.items.map((i) => ({
      ...i,
      outsideBusiness: next.has(i.position),
    })),
  };
  const { expenseId } = detail;
  return { invoiceId, expenseId, expenseAmount, outsideItemCount: next.size };
}

/**
 * `/purchases/*` do fake, como o backend: notas, preços, histórico do produto, mercados e a
 * marcação dos itens de fora (que mexe na nota guardada em `details`).
 *
 * @example fakePurchaseRoute(api.purchases, 'GET', '/purchases/products', 'from=…&to=…', {}, {})
 */
export function fakePurchaseRoute(
  data: FakePurchaseData,
  method: HttpMethod,
  path: string,
  query: string,
  body: Record<string, unknown>,
  details: Record<number, ExpenseInvoiceDetail>,
): unknown {
  const id = Number(path.split('/')[3]);
  if (path.endsWith('/outside-items')) return markedOutside(details, id, body);
  if (method === 'PUT') return renamed(data, id, body);
  if (path === '/purchases/invoices') return data.invoices;
  if (path === '/purchases/products') return data.products;
  if (path === '/purchases/vendors') return data.vendors;
  const params = new URLSearchParams(query);
  return data.history[`${params.get('vendorId')}|${params.get('code')}`] ?? [];
}
