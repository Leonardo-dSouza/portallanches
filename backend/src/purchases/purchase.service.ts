import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  Optional,
  UnprocessableEntityException,
} from '@nestjs/common';
import {
  DEFAULT_BUSINESS_TIMEZONE,
  toBusinessDate,
} from '../closing/business-date.js';
import { BUSINESS_TIMEZONE } from '../common/clock.js';
import {
  assertOutsidePositions,
  outsideGrossCentsOf,
  resolveBusinessDiscount,
} from '../expenses/outside-items.js';
import { rebalancedExpenseAmount } from './expense-rebalance.js';
import { parseInvoiceStockEntryInput } from './invoice-stock-entry-input.js';
import {
  INVOICE_STOCK_START,
  planInvoiceStockEntry,
} from './invoice-stock-entry.js';
import { parseItemLinkInput } from './item-link-input.js';
import { summarizePrices } from './price-summary.js';
import {
  parseIssuedRange,
  parseOutsideItems,
  parseProductQuery,
  parseVendorNickname,
} from './purchase-input.js';
import type {
  ItemLinkRecord,
  OutsideItemsResult,
  ProductPriceSummary,
  ProductPurchase,
  PurchaseInvoiceRow,
  SupplyLastPricesMap,
  SupplyPriceRow,
  VendorSummary,
} from './purchase-records.js';
import type { LotRecord } from '../stock/stock-repository.js';
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
    @Optional()
    @Inject(BUSINESS_TIMEZONE)
    private readonly timeZone: string = DEFAULT_BUSINESS_TIMEZONE,
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

  /**
   * Salva ou substitui a ligação de um item da nota fiscal a um insumo do estoque.
   *
   * @example await service.saveItemLink(1, { vendorId: 2, code: '100', supplyId: 3, baseQuantity: '1' })
   */
  async saveItemLink(userId: number, body: unknown): Promise<ItemLinkRecord> {
    const input = parseItemLinkInput(body);
    return this.purchases.saveItemLink(userId, input);
  }

  /**
   * Remove a ligação de um produto de mercado ao estoque; 404 se não existir.
   *
   * @example await service.deleteItemLink(2, '100')
   */
  async deleteItemLink(vendorId: number, code: string): Promise<void> {
    const deleted = await this.purchases.deleteItemLink(vendorId, code);
    if (!deleted) {
      throw new NotFoundException(
        `Ligação do mercado ${vendorId} e código "${code}" não encontrada`,
      );
    }
  }

  /**
   * Troca os itens fora da lanchonete de uma nota já lançada (pedido do usuário, 2026-10-25) e
   * recalcula o gasto daquela noite pela diferença, mesmo com a noite fechada (só o admin chega
   * aqui).
   *
   * @example await service.markOutsideItems(12, { positions: [9, 10, 11] })
   */
  async markOutsideItems(
    invoiceId: number,
    body: unknown,
  ): Promise<OutsideItemsResult> {
    const input = parseOutsideItems(body);
    const snapshot = await this.purchases.findOutsideSnapshot(invoiceId);
    if (!snapshot)
      throw new NotFoundException(`Nota fiscal ${invoiceId} não encontrada`);
    assertOutsidePositions(input.positions, snapshot.items.length);
    const outsideGrossCents = outsideGrossCentsOf(
      snapshot.items,
      input.positions,
    );
    const businessDiscount = resolveBusinessDiscount(
      input.positions,
      input.businessDiscount,
      snapshot.discount,
      outsideGrossCents,
    );
    const expenseAmount = rebalancedExpenseAmount(
      snapshot,
      input.positions,
      businessDiscount,
    );
    const { expenseId } = snapshot;
    const saved = await this.purchases.saveOutsideItems({
      invoiceId,
      expenseId,
      positions: input.positions,
      businessDiscount,
      previousAmount: snapshot.expenseAmount,
      expenseAmount,
    });
    if (!saved) throw changedMeanwhile(expenseId, snapshot.expenseAmount);
    return {
      invoiceId,
      expenseId,
      expenseAmount,
      outsideItemCount: input.positions.length,
    };
  }

  /**
   * Lança os itens escolhidos de uma nota fiscal como lotes no estoque.
   *
   * @example await service.enterInvoiceStock(12, 1, { items: [{ itemId: 1, expiresOn: null }] })
   */
  async enterInvoiceStock(
    invoiceId: number,
    userId: number,
    body: unknown,
  ): Promise<LotRecord[]> {
    const chosen = parseInvoiceStockEntryInput(body);
    const target = await this.purchases.findInvoiceStockTarget(invoiceId);
    if (!target) {
      throw new NotFoundException(`Nota fiscal ${invoiceId} não encontrada`);
    }
    const issuedDate = toBusinessDate(target.issuedAt, this.timeZone);
    if (issuedDate < INVOICE_STOCK_START) {
      throw new UnprocessableEntityException(
        `Nota fiscal emitida em ${issuedDate} não pode ser lançada no estoque: início permitido em ${INVOICE_STOCK_START}`,
      );
    }
    if (target.stockEnteredAt !== null) {
      throw new ConflictException(
        `Nota fiscal ${invoiceId} já foi lançada no estoque`,
      );
    }
    const lots = planInvoiceStockEntry(target.items, chosen, userId);
    return this.purchases.saveInvoiceStockEntry(invoiceId, userId, lots);
  }

  /**
   * Lista todas as compras ligadas ao insumo (mais recente primeiro).
   *
   * @example await service.supplyPrices(10)
   */
  async supplyPrices(supplyId: number): Promise<SupplyPriceRow[]> {
    return this.purchases.listSupplyPrices(supplyId);
  }

  /**
   * Lista a compra mais recente de cada insumo ligado (para a área Custos).
   *
   * @example await service.lastPrices()
   */
  async lastPrices(): Promise<SupplyLastPricesMap> {
    return this.purchases.listLastPrices();
  }
}

function changedMeanwhile(expenseId: number, read: string): ConflictException {
  return new ConflictException(
    `O gasto #${expenseId} mudou enquanto a nota estava aberta (era R$ ${read}): recarregue e marque de novo`,
  );
}
