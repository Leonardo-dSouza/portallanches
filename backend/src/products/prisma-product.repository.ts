import { Inject, Injectable } from '@nestjs/common';
import type { Prisma } from '../generated/prisma/client.js';
import { PrismaClient } from '../generated/prisma/client.js';
import { toDbDate } from '../common/db-date.js';
import { DATABASE_CLIENT } from '../prisma/prisma.service.js';
import { datedPriceSelect, toDatedProduct } from './prisma-dated-price.js';
import {
  recordProductChange,
  TRACKED_SELECT,
} from './prisma-product-change.js';
import type {
  ProductData,
  ProductRecord,
  ProductRepository,
} from './product-repository.js';
import type { DatedMenuEntry } from './sale-menu.js';

const WITH_DETAILS = {
  include: {
    category: { select: { name: true } },
    components: {
      include: {
        supply: { select: { name: true, countUnit: true, unitCost: true } },
      },
      orderBy: { id: 'asc' },
    },
  },
} as const;

type ProductRow = Prisma.ProductGetPayload<typeof WITH_DETAILS>;
type ComponentRow = ProductRow['components'][number];

const toComponent = (row: ComponentRow) => ({
  supplyId: row.supplyId,
  supplyName: row.supply.name,
  countUnit: row.supply.countUnit,
  unitCost: row.supply.unitCost?.toString() ?? null,
  quantity: row.quantity.toString(),
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
});

const MENU_ORDER = [
  { category: { sortOrder: 'asc' } },
  { menuNumber: { sort: 'asc', nulls: 'last' } },
  { name: 'asc' },
] as const satisfies Prisma.ProductOrderByWithRelationInput[];

const datedMenuSelect = (businessDate: string) =>
  ({
    id: true,
    name: true,
    menuNumber: true,
    category: { select: { name: true } },
    ...datedPriceSelect(businessDate),
  }) as const satisfies Prisma.ProductSelect;

type DatedMenuRow = Prisma.ProductGetPayload<{
  select: ReturnType<typeof datedMenuSelect>;
}>;

const toDatedMenuEntry = (row: DatedMenuRow): DatedMenuEntry => ({
  id: row.id,
  name: row.name,
  menuNumber: row.menuNumber,
  categoryName: row.category.name,
  ...toDatedProduct(row),
});

function scalarFields(data: ProductData) {
  const { components: _components, ...fields } = data;
  return fields;
}

const componentsOf = (data: ProductData) =>
  data.components.map((c) => ({ supplyId: c.supplyId, quantity: c.quantity }));

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

  async create(data: ProductData): Promise<ProductRecord> {
    const row = await this.prisma.product.create({
      data: {
        ...scalarFields(data),
        components: { create: componentsOf(data) },
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
        },
        ...WITH_DETAILS,
      });
      return toProduct(row);
    });
  }
}
