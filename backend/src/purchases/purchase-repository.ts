import type { ItemLinkInput } from './item-link-input.js';
import type {
  IssuedRange,
  ItemLinkRecord,
  ItemPriceRow,
  OutsideItemsChange,
  OutsideSnapshot,
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

/**
 * Leituras da aba Compras; todas filtram pela data de emissão da nota. Preços e histórico
 * deixam de fora os itens fora da lanchonete (2026-10-25).
 */
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
  /** Os itens da nota e o gasto dela; null se a nota não existe. */
  findOutsideSnapshot(invoiceId: number): Promise<OutsideSnapshot | null>;
  /**
   * Grava as marcas e o valor novo juntos, só se o gasto ainda tiver o valor lido antes
   * (`previousAmount`); false = o gasto mudou no meio (nada gravado).
   */
  saveOutsideItems(change: OutsideItemsChange): Promise<boolean>;
  /** Salva ou substitui a ligação de um item da nota fiscal a um insumo do estoque. */
  saveItemLink(userId: number, input: ItemLinkInput): Promise<ItemLinkRecord>;
  /** Remove a ligação de um item da nota fiscal; false se a ligação não existia. */
  deleteItemLink(vendorId: number, code: string): Promise<boolean>;
  /** Busca uma nota específica com itens e alertas; null se não encontrada. */
  findInvoice(id: number): Promise<PurchaseInvoiceRow | null>;
}
