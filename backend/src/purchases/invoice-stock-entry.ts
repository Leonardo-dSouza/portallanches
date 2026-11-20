import { UnprocessableEntityException } from '@nestjs/common';
import { fromMilli, multiplyQuantities, toMilli } from '../common/quantity.js';
import type { NewLot } from '../stock/stock-repository.js';
import type { InvoiceStockEntryChoice } from './invoice-stock-entry-input.js';
import { paidUnitCost } from './price-alert.js';

/** Início permitido para lançamento de notas fiscais no estoque (decisão do dono). */
export const INVOICE_STOCK_START = '2026-11-14';

/** Item da nota fiscal com sua ligação ao insumo do estoque. */
export interface LinkedInvoiceItem {
  id: number;
  invoiceId: number;
  quantity: string;
  unitPrice: string;
  outsideBusiness: boolean;
  link: {
    supplyId: number;
    baseQuantity: string;
    /** Sem baixa na venda o estoque do insumo é só pela contagem: não entra pela nota. */
    deductOnSale: boolean;
  } | null;
}

function calculateLotQuantity(
  itemQuantity: string,
  baseQuantity: string,
): string {
  const direct = multiplyQuantities(itemQuantity, baseQuantity);
  if (direct !== null) return direct;
  const product = BigInt(toMilli(itemQuantity)) * BigInt(toMilli(baseQuantity));
  return fromMilli(Number((product + 500n) / 1000n));
}

function assertValidItem(
  item: LinkedInvoiceItem | undefined,
  itemId: number,
): asserts item is LinkedInvoiceItem & {
  link: { supplyId: number; baseQuantity: string; deductOnSale: boolean };
} {
  if (!item) {
    throw new UnprocessableEntityException(
      `Item ${itemId} não encontrado na nota fiscal`,
    );
  }
  if (item.outsideBusiness) {
    throw new UnprocessableEntityException(
      `Item ${itemId} está fora da lanchonete e não pode entrar no estoque`,
    );
  }
  if (!item.link) {
    throw new UnprocessableEntityException(
      `Item ${itemId} não está ligado a um insumo do estoque`,
    );
  }
  // Pedido do dono (19/11): sem a baixa o lote só cresceria até a próxima contagem.
  if (!item.link.deductOnSale) {
    throw new UnprocessableEntityException(
      `Item ${itemId} está ligado ao insumo ${item.link.supplyId}, sem baixa na venda: esperado insumo com baixa na venda (o estoque dele é pela contagem)`,
    );
  }
}

function toNewLot(
  item: LinkedInvoiceItem,
  choice: InvoiceStockEntryChoice,
  userId: number,
): NewLot {
  assertValidItem(item, choice.itemId);
  const quantity = calculateLotQuantity(item.quantity, item.link.baseQuantity);
  const unitCost = paidUnitCost(item.unitPrice, item.link.baseQuantity);
  return {
    supplyId: item.link.supplyId,
    quantity,
    expiresOn: choice.expiresOn,
    createdById: userId,
    unitCost,
    invoiceItemId: item.id,
  };
}

/**
 * Converte itens escolhidos de uma nota fiscal de compra em lotes de entrada no estoque.
 *
 * @example planInvoiceStockEntry(items, [{ itemId: 10, expiresOn: null }], 1)
 */
export function planInvoiceStockEntry(
  items: LinkedInvoiceItem[],
  chosen: InvoiceStockEntryChoice[],
  userId: number,
): NewLot[] {
  const itemMap = new Map(items.map((i) => [i.id, i]));
  return chosen.map((choice) => {
    const item = itemMap.get(choice.itemId);
    return toNewLot(item as LinkedInvoiceItem, choice, userId);
  });
}
