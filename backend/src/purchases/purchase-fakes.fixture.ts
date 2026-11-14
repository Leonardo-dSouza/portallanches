import { UnprocessableEntityException } from '@nestjs/common';
import {
  baseUnitCostOn,
  type UnitCostHistoryPoint,
} from '../costs/base-on-date.js';
import type { ItemLinkInput } from './item-link-input.js';
import { priceAlert } from './price-alert.js';
import type {
  IssuedRange,
  ItemLinkRecord,
  ItemPriceRow,
  OutsideItemsChange,
  OutsideSnapshot,
  ProductPurchase,
  PurchaseInvoiceItemRow,
  PurchaseInvoiceRow,
  VendorSummary,
} from './purchase-records.js';
import type {
  PurchaseRepository,
  VendorRecord,
} from './purchase-repository.js';

const inRange = (issuedAt: Date, range: IssuedRange) =>
  issuedAt >= range.from && issuedAt < range.until;

export interface FakeSupply {
  id: number;
  name: string;
  unitCost: string | null;
}

/** Compras em memória para testes do serviço e controller. */
export class FakePurchaseRepository implements PurchaseRepository {
  private nextLinkId = 1;
  readonly prices: ItemPriceRow[] = [];
  readonly nicknames = new Map<number, string | null>();
  readonly historyQueries: { vendorId: number; code: string }[] = [];
  readonly snapshots = new Map<number, OutsideSnapshot>();
  readonly savedOutside: OutsideItemsChange[] = [];
  readonly vendors = new Map<number, VendorRecord>();
  readonly supplies = new Map<number, FakeSupply>();
  readonly links = new Map<string, ItemLinkRecord>();
  readonly supplyCostHistories = new Map<number, UnitCostHistoryPoint[]>();
  readonly invoices = new Map<number, PurchaseInvoiceRow>();

  async listInvoices(range: IssuedRange): Promise<PurchaseInvoiceRow[]> {
    const list = Array.from(this.invoices.values()).filter((row) =>
      inRange(new Date(row.issuedAt), range),
    );
    return list.map((inv) => this.enrichInvoice(inv));
  }

  async findInvoice(id: number): Promise<PurchaseInvoiceRow | null> {
    const inv = this.invoices.get(id);
    return inv ? this.enrichInvoice(inv) : null;
  }

  async listItemPrices(range: IssuedRange): Promise<ItemPriceRow[]> {
    return this.prices.filter((row) => inRange(row.issuedAt, range));
  }

  async listProductHistory(
    vendorId: number,
    code: string,
  ): Promise<ProductPurchase[]> {
    this.historyQueries.push({ vendorId, code });
    return [];
  }

  async listVendors(): Promise<VendorSummary[]> {
    return [];
  }

  async updateNickname(
    id: number,
    nickname: string | null,
  ): Promise<VendorRecord> {
    this.nicknames.set(id, nickname);
    return { id, cnpjRoot: '11222333', legalName: 'MERCADO EXEMPLO', nickname };
  }

  async findOutsideSnapshot(
    invoiceId: number,
  ): Promise<OutsideSnapshot | null> {
    return this.snapshots.get(invoiceId) ?? null;
  }

  async saveOutsideItems(change: OutsideItemsChange): Promise<boolean> {
    const snapshot = this.snapshots.get(change.invoiceId);
    if (snapshot?.expenseAmount !== change.previousAmount) return false;
    this.savedOutside.push(change);
    const outside = new Set(change.positions);
    this.snapshots.set(change.invoiceId, {
      ...snapshot,
      expenseAmount: change.expenseAmount,
      businessDiscount: change.businessDiscount,
      items: snapshot.items.map((item) => ({
        ...item,
        outsideBusiness: outside.has(item.position),
      })),
    });
    return true;
  }

  async saveItemLink(
    _userId: number,
    input: ItemLinkInput,
  ): Promise<ItemLinkRecord> {
    if (!this.vendors.has(input.vendorId)) {
      throw new UnprocessableEntityException(
        `Mercado ${input.vendorId} não encontrado`,
      );
    }
    if (!this.supplies.has(input.supplyId)) {
      throw new UnprocessableEntityException(
        `Insumo ${input.supplyId} não encontrado`,
      );
    }
    const key = `${input.vendorId}|${input.code}`;
    const existing = this.links.get(key);
    const record: ItemLinkRecord = {
      id: existing?.id ?? this.nextLinkId++,
      vendorId: input.vendorId,
      code: input.code,
      supplyId: input.supplyId,
      baseQuantity: input.baseQuantity,
      label: input.label,
    };
    this.links.set(key, record);
    return record;
  }

  async deleteItemLink(vendorId: number, code: string): Promise<boolean> {
    const key = `${vendorId}|${code}`;
    return this.links.delete(key);
  }

  private enrichInvoice(inv: PurchaseInvoiceRow): PurchaseInvoiceRow {
    const items = (inv.items ?? []).map((item) =>
      this.enrichItem(inv.vendorId, new Date(inv.issuedAt), item),
    );
    const outsideItemCount = items.filter((i) => i.outsideBusiness).length;
    const aboveBaseCount = items.filter(
      (i) => !i.outsideBusiness && i.alert?.above === true,
    ).length;
    return {
      ...inv,
      items,
      itemCount: items.length,
      outsideItemCount,
      aboveBaseCount,
    };
  }

  private enrichItem(
    vendorId: number,
    issuedAt: Date,
    item: PurchaseInvoiceItemRow,
  ): PurchaseInvoiceItemRow {
    const linkData = this.links.get(`${vendorId}|${item.code}`);
    const supply = linkData ? this.supplies.get(linkData.supplyId) : null;
    const link =
      linkData && supply
        ? {
            supplyId: supply.id,
            supplyName: supply.name,
            baseQuantity: linkData.baseQuantity,
            label: linkData.label,
          }
        : null;
    if (item.outsideBusiness || !link) {
      return { ...item, link, alert: null };
    }
    const history = this.supplyCostHistories.get(link.supplyId) ?? [];
    const baseCost = baseUnitCostOn(
      history,
      supply?.unitCost ?? null,
      issuedAt,
    );
    const alert = priceAlert(item.unitPrice, link.baseQuantity, baseCost);
    return { ...item, link, alert };
  }
}
