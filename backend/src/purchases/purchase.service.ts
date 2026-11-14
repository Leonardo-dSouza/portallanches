import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  assertOutsidePositions,
  outsideGrossCentsOf,
  resolveBusinessDiscount,
} from '../expenses/outside-items.js';
import { rebalancedExpenseAmount } from './expense-rebalance.js';
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
}

function changedMeanwhile(expenseId: number, read: string): ConflictException {
  return new ConflictException(
    `O gasto #${expenseId} mudou enquanto a nota estava aberta (era R$ ${read}): recarregue e marque de novo`,
  );
}
