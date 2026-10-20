import { Inject, Injectable } from '@nestjs/common';
import { summarizePrices } from './price-summary.js';
import {
  parseIssuedRange,
  parseProductQuery,
  parseVendorNickname,
} from './purchase-input.js';
import type {
  ProductPriceSummary,
  ProductPurchase,
  PurchaseInvoiceRow,
  VendorSummary,
} from './purchase-records.js';
import {
  PURCHASE_REPOSITORY,
  type PurchaseRepository,
  type VendorRecord,
} from './purchase-repository.js';

/**
 * Aba Compras (só admin): notas, preços por produto e mercados do período, pela data de
 * emissão da nota. As notas entram pelo caixa, como gasto; aqui só se consulta e dá apelido.
 *
 * @example await service.listProducts('2026-10-01', '2026-10-31')
 */
@Injectable()
export class PurchaseService {
  constructor(
    @Inject(PURCHASE_REPOSITORY) private readonly purchases: PurchaseRepository,
  ) {}

  async listInvoices(
    rawFrom?: string,
    rawTo?: string,
  ): Promise<PurchaseInvoiceRow[]> {
    return this.purchases.listInvoices(parseIssuedRange(rawFrom, rawTo));
  }

  async listProducts(
    rawFrom?: string,
    rawTo?: string,
  ): Promise<ProductPriceSummary[]> {
    const range = parseIssuedRange(rawFrom, rawTo);
    return summarizePrices(await this.purchases.listItemPrices(range));
  }

  async productHistory(
    rawVendorId: string | undefined,
    rawCode: string | undefined,
    rawFrom?: string,
    rawTo?: string,
  ): Promise<ProductPurchase[]> {
    const { vendorId, code } = parseProductQuery(rawVendorId, rawCode);
    const range = parseIssuedRange(rawFrom, rawTo);
    return this.purchases.listProductHistory(vendorId, code, range);
  }

  async listVendors(
    rawFrom?: string,
    rawTo?: string,
  ): Promise<VendorSummary[]> {
    return this.purchases.listVendors(parseIssuedRange(rawFrom, rawTo));
  }

  async renameVendor(id: number, body: unknown): Promise<VendorRecord> {
    return this.purchases.updateNickname(id, parseVendorNickname(body));
  }
}
