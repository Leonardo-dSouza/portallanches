import { ApiError, type HttpMethod } from '../api/api-client';
import type { ExpenseInvoiceDetail } from '../api/invoice-types';
import { centsToMoney, moneyToCents } from '../api/money';
import { calculateInvoiceSplit } from '../purchases/outside-items';
import type {
  ItemSupplyLink,
  OutsideItemsResult,
  ProductPriceSummary,
  ProductPurchase,
  PurchaseInvoiceRow,
  SupplyLastPricesMap,
  SupplyPriceRecord,
  VendorSummary,
} from '../api/purchase-types';

/** O que a aba Compras do fake devolve (o backend é quem filtra o período e agrega). */
export class FakePurchaseData {
  invoices: PurchaseInvoiceRow[] = [];
  products: ProductPriceSummary[] = [];
  /** Histórico por produto, na chave `vendorId|código`. */
  history: Record<string, ProductPurchase[]> = {};
  vendors: VendorSummary[] = [];
  /** Ligações de itens salvas no fake, na chave `vendorId|código`. */
  links: Record<string, ItemSupplyLink> = {};
  /** Histórico de preços pagos por insumo. */
  supplyPrices: Record<number, SupplyPriceRecord[]> = {};
  /** Último preço pago de cada insumo. */
  lastPrices: SupplyLastPricesMap = {};
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

function netCentsOf(
  detail: ExpenseInvoiceDetail,
  outside: Set<number>,
  businessDiscount?: string,
): number {
  const gross = outsideCents(detail, outside);
  const discountCents = moneyToCents(detail.discount ?? '0.00');
  const businessDiscountCents = moneyToCents(
    businessDiscount ?? detail.businessDiscount ?? detail.discount ?? '0.00',
  );
  return calculateInvoiceSplit({
    amountDueCents: 0,
    outsideGrossCents: gross,
    discountCents,
    businessDiscountCents,
  }).outsideNetCents;
}

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
  const businessDiscount =
    next.size === 0
      ? detail.discount
      : ((body.businessDiscount as string | undefined) ?? detail.discount);
  const beforeNet = netCentsOf(detail, before, detail.businessDiscount);
  const afterNet = netCentsOf(detail, next, businessDiscount);
  const cents = moneyToCents(detail.expenseAmount) + beforeNet - afterNet;
  if (cents <= 0)
    throw new ApiError(
      422,
      `O gasto #${detail.expenseId} ficaria com R$ ${(cents / 100).toFixed(2)}: esperado valor maior que zero; ajuste o gasto no Caixa antes`,
    );
  const expenseAmount = centsToMoney(cents);
  details[invoiceId] = {
    ...detail,
    expenseAmount,
    businessDiscount,
    items: detail.items.map((i) => ({
      ...i,
      outsideBusiness: next.has(i.position),
    })),
  };
  const { expenseId } = detail;
  return { invoiceId, expenseId, expenseAmount, outsideItemCount: next.size };
}

function saveLink(data: FakePurchaseData, body: Record<string, unknown>) {
  const vendorId = Number(body.vendorId);
  const code = String(body.code);
  const supplyId = Number(body.supplyId);
  const baseQuantity = String(body.baseQuantity);
  const label = (body.label as string | null) ?? null;
  const link: ItemSupplyLink = {
    supplyId,
    supplyName: `Insumo ${supplyId}`,
    baseQuantity,
    label,
  };
  data.links[`${vendorId}|${code}`] = link;
  for (const inv of data.invoices) {
    if (inv.vendorId === vendorId && inv.items) {
      for (const item of inv.items) {
        if (item.code === code) item.link = link;
      }
    }
  }
  return link;
}

function removeLink(data: FakePurchaseData, vendorId: number, code: string) {
  delete data.links[`${vendorId}|${code}`];
  for (const inv of data.invoices) {
    if (inv.vendorId === vendorId && inv.items) {
      for (const item of inv.items) {
        if (item.code === code) {
          item.link = null;
          item.alert = null;
        }
      }
    }
  }
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
  if (path === '/purchases/supplies/last-prices') return data.lastPrices;
  const supplyMatch = /^\/purchases\/supplies\/(\d+)\/prices$/.exec(path);
  if (supplyMatch) return data.supplyPrices[Number(supplyMatch[1])] ?? [];
  if (method === 'PUT' && path === '/purchases/item-links')
    return saveLink(data, body);
  if (method === 'DELETE' && path.startsWith('/purchases/item-links/')) {
    const [, , , rawVendor, rawCode] = path.split('/');
    return removeLink(data, Number(rawVendor), rawCode);
  }
  const id = Number(path.split('/')[3]);
  if (method === 'POST' && path.endsWith('/stock-entry')) {
    const invoice = data.invoices.find((inv) => inv.id === id);
    if (invoice?.stockEnteredAt) {
      throw new ApiError(409, `Nota fiscal ${id} já foi lançada no estoque`);
    }
    if (invoice) {
      const issuedDate = invoice.issuedAt.slice(0, 10);
      if (issuedDate < '2026-11-14') {
        throw new ApiError(
          422,
          `Nota fiscal emitida em ${issuedDate} não pode ser lançada no estoque: início permitido em 2026-11-14`,
        );
      }
      invoice.stockEnteredAt = new Date().toISOString();
      invoice.stockEnteredByName = 'Admin';
    }
    return [];
  }
  if (path.endsWith('/outside-items')) return markedOutside(details, id, body);
  if (method === 'PUT') return renamed(data, id, body);
  if (path === '/purchases/invoices') return data.invoices;
  if (path === '/purchases/products') return data.products;
  if (path === '/purchases/vendors') return data.vendors;
  const params = new URLSearchParams(query);
  return data.history[`${params.get('vendorId')}|${params.get('code')}`] ?? [];
}
