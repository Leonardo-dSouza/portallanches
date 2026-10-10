import { Inject, Injectable } from '@nestjs/common';
import type { Prisma } from '../generated/prisma/client.js';
import { PrismaClient } from '../generated/prisma/client.js';
import { toDbDate } from '../common/db-date.js';
import { toMilli } from '../common/quantity.js';
import { DATABASE_CLIENT } from '../prisma/prisma.service.js';
import { datedPriceSelect, toDatedProduct } from './prisma-dated-price.js';
import {
  recordProductChange,
  TRACKED_SELECT,
} from './prisma-product-change.js';
import type {
  BundleFacts,
  BundleItemRecord,
  ProductData,
  ProductRecord,
  ProductRepository,
} from './product-repository.js';
import type { DatedMenuEntry } from './sale-menu.js';
import type { StockComponent } from './stock-left.js';

const COMPONENTS = {
  include: {
    supply: { select: { name: true, countUnit: true, unitCost: true } },
  },
  orderBy: { id: 'asc' },
} as const;

const WITH_DETAILS = {
  include: {
    category: { select: { name: true } },
    components: COMPONENTS,
    bundleItems: {
      include: { item: { select: { name: true, components: COMPONENTS } } },
      orderBy: { id: 'asc' },
    },
  },
} as const;

type ProductRow = Prisma.ProductGetPayload<typeof WITH_DETAILS>;
type ComponentRow = ProductRow['components'][number];
type BundleItemRow = ProductRow['bundleItems'][number];

const toComponent = (row: ComponentRow) => ({
  supplyId: row.supplyId,
  supplyName: row.supply.name,
  countUnit: row.supply.countUnit,
  unitCost: row.supply.unitCost?.toString() ?? null,
  quantity: row.quantity.toString(),
});

const toBundleItem = (row: BundleItemRow): BundleItemRecord => ({
  productId: row.itemProductId,
  productName: row.item.name,
  quantity: row.quantity,
  components: row.item.components.map(toComponent),
});

const toProduct = (row: ProductRow): ProductRecord => ({
  id: row.id,
  categoryId: row.categoryId,
  categoryName: row.category.name,
  menuNumber: row.menuNumber,
  name: row.name,
  description: row.description,
  salePrice: row.salePrice?.toFixed(2) ?? null,
  active: row.active,
  components: row.components.map(toComponent),
  bundleItems: row.bundleItems.map(toBundleItem),
});

const MENU_ORDER = [
  { category: { sortOrder: 'asc' } },
  { menuNumber: { sort: 'asc', nulls: 'last' } },
  { name: 'asc' },
] as const satisfies Prisma.ProductOrderByWithRelationInput[];

const STOCK_COMPONENTS = {
  where: { supply: { deductOnSale: true } },
  select: { supplyId: true, quantity: true },
} as const;

const datedMenuSelect = (businessDate: string) =>
  ({
    id: true,
    name: true,
    menuNumber: true,
    categoryId: true,
    category: { select: { name: true, addonCategoryId: true } },
    ...datedPriceSelect(businessDate),
    // Só os insumos com baixa (bebidas): o saldo deles vai para o aviso do caixa.
    components: STOCK_COMPONENTS,
    bundleItems: {
      select: {
        quantity: true,
        item: { select: { components: STOCK_COMPONENTS } },
      },
    },
  }) as const satisfies Prisma.ProductSelect;

type DatedMenuRow = Prisma.ProductGetPayload<{
  select: ReturnType<typeof datedMenuSelect>;
}>;

type StockComponentRow = { supplyId: number; quantity: Prisma.Decimal };

const toStockComponent = (c: StockComponentRow, times: number) => ({
  supplyId: c.supplyId,
  milli: toMilli(c.quantity.toString()) * times,
});

/** Insumos com baixa por unidade do item; combo: os dos itens vezes a quantidade de cada. */
function stockComponentsOf(row: DatedMenuRow): StockComponent[] {
  const own = row.components.map((c) => toStockComponent(c, 1));
  const bundled = row.bundleItems.flatMap((b) =>
    b.item.components.map((c) => toStockComponent(c, b.quantity)),
  );
  return [...own, ...bundled];
}

const toDatedMenuEntry = (row: DatedMenuRow): DatedMenuEntry => ({
  id: row.id,
  name: row.name,
  menuNumber: row.menuNumber,
  categoryId: row.categoryId,
  categoryName: row.category.name,
  addonCategoryId: row.category.addonCategoryId,
  ...toDatedProduct(row),
  stockComponents: stockComponentsOf(row),
});

function scalarFields(data: ProductData) {
  const { components: _components, bundleItems: _items, ...fields } = data;
  return fields;
}

const componentsOf = (data: ProductData) =>
  data.components.map((c) => ({ supplyId: c.supplyId, quantity: c.quantity }));

const bundleItemsOf = (data: ProductData) =>
  data.bundleItems.map((i) => ({
    itemProductId: i.productId,
    quantity: i.quantity,
  }));

@Injectable()
export class PrismaProductRepository implements ProductRepository {
  constructor(@Inject(DATABASE_CLIENT) private readonly prisma: PrismaClient) {}

  async list(): Promise<ProductRecord[]> {
    const rows = await this.prisma.product.findMany({
      ...WITH_DETAILS,
      orderBy: MENU_ORDER,
    });
    return rows.map(toProduct);
  }

  async listDatedMenu(businessDate: string): Promise<DatedMenuEntry[]> {
    const rows = await this.prisma.product.findMany({
      where: {
        OR: [
          { active: true },
          { deactivatedOn: { gt: toDbDate(businessDate) } },
        ],
      },
      select: datedMenuSelect(businessDate),
      orderBy: MENU_ORDER,
    });
    return rows.map(toDatedMenuEntry);
  }

  async stockBalances(supplyIds: number[]): Promise<Map<number, number>> {
    const rows = await this.prisma.stockLot.groupBy({
      by: ['supplyId'],
      where: { supplyId: { in: supplyIds }, remaining: { gt: 0 } },
      _sum: { remaining: true },
    });
    return new Map(
      rows.map((r) => [
        r.supplyId,
        toMilli(r._sum.remaining?.toString() ?? '0'),
      ]),
    );
  }

  async exists(id: number): Promise<boolean> {
    return (await this.prisma.product.count({ where: { id } })) > 0;
  }

  async categoryExists(categoryId: number): Promise<boolean> {
    const where = { id: categoryId };
    return (await this.prisma.productCategory.count({ where })) > 0;
  }

  async missingSupplyIds(supplyIds: number[]): Promise<number[]> {
    const found = await this.prisma.supply.findMany({
      where: { id: { in: supplyIds } },
      select: { id: true },
    });
    const foundIds = new Set(found.map((s) => s.id));
    return supplyIds.filter((id) => !foundIds.has(id));
  }

  async bundleFacts(
    productId: number | null,
    itemIds: number[],
  ): Promise<BundleFacts> {
    const [found, usedIn] = await Promise.all([
      this.prisma.product.findMany({
        where: { id: { in: itemIds } },
        select: { id: true, _count: { select: { bundleItems: true } } },
      }),
      productId === null
        ? 0
        : this.prisma.productBundleItem.count({
            where: { itemProductId: productId },
          }),
    ]);
    const foundIds = new Set(found.map((p) => p.id));
    return {
      missing: itemIds.filter((id) => !foundIds.has(id)),
      combos: found.filter((p) => p._count.bundleItems > 0).map((p) => p.id),
      usedInCombo: usedIn > 0,
    };
  }

  async create(data: ProductData): Promise<ProductRecord> {
    const row = await this.prisma.product.create({
      data: {
        ...scalarFields(data),
        components: { create: componentsOf(data) },
        bundleItems: { create: bundleItemsOf(data) },
      },
      ...WITH_DETAILS,
    });
    return toProduct(row);
  }

  update(id: number, data: ProductData, today: string): Promise<ProductRecord> {
    return this.prisma.$transaction(async (tx) => {
      const before = await tx.product.findUniqueOrThrow({
        where: { id },
        select: TRACKED_SELECT,
      });
      const { deactivatedOn } = await recordProductChange(
        tx,
        before,
        data,
        today,
      );
      const row = await tx.product.update({
        where: { id },
        data: {
          ...scalarFields(data),
          deactivatedOn,
          components: { deleteMany: {}, create: componentsOf(data) },
          bundleItems: { deleteMany: {}, create: bundleItemsOf(data) },
        },
        ...WITH_DETAILS,
      });
      return toProduct(row);
    });
  }
}
