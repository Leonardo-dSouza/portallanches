import type {
  IssuedRange,
  ItemPriceRow,
  ProductPurchase,
  PurchaseInvoiceRow,
  VendorSummary,
} from './purchase-records.js';

export const PURCHASE_REPOSITORY = Symbol('PURCHASE_REPOSITORY');

/** Mercado depois de trocar o apelido. */
export interface VendorRecord {
  id: number;
  cnpjRoot: string;
  legalName: string;
  nickname: string | null;
}

/** Leituras da aba Compras; todas filtram pela data de emissão da nota. */
export interface PurchaseRepository {
  /** Notas do período, da mais nova para a mais antiga. */
  listInvoices(range: IssuedRange): Promise<PurchaseInvoiceRow[]>;
  listItemPrices(range: IssuedRange): Promise<ItemPriceRow[]>;
  /** Compras do produto (mercado + código), da mais nova para a mais antiga. */
  listProductHistory(
    vendorId: number,
    code: string,
    range: IssuedRange,
  ): Promise<ProductPurchase[]>;
  /** Todos os mercados, com as notas e o total só do período. */
  listVendors(range: IssuedRange): Promise<VendorSummary[]>;
  /** 404 (pelo filtro do Prisma) se o mercado não existe. */
  updateNickname(id: number, nickname: string | null): Promise<VendorRecord>;
}
