import { Inject, Injectable } from '@nestjs/common';
import type { Prisma } from '../generated/prisma/client.js';
import { PrismaClient } from '../generated/prisma/client.js';
import { normalizeDecimal } from '../common/quantity.js';
import { DATABASE_CLIENT } from '../prisma/prisma.service.js';
import type {
  CategoryData,
  CategoryProductOrder,
  CategoryRecord,
  ProductCategoryRepository,
} from './product-category-repository.js';

const CATEGORY_SELECT = {
  id: true,
  name: true,
  nameKey: true,
  sortOrder: true,
  active: true,
  addonCategoryId: true,
  choiceCategoryId: true,
  fixedCostPercent: true,
  profitPercent: true,
} as const;

type CategoryRow = Prisma.ProductCategoryGetPayload<{
  select: typeof CATEGORY_SELECT;
}>;

function toCategoryRecord(row: CategoryRow): CategoryRecord {
  return {
    id: row.id,
    name: row.name,
    nameKey: row.nameKey,
    sortOrder: row.sortOrder,
    active: row.active,
    addonCategoryId: row.addonCategoryId,
    choiceCategoryId: row.choiceCategoryId,
    fixedCostPercent:
      row.fixedCostPercent === null
        ? null
        : normalizeDecimal(row.fixedCostPercent.toString(), 2),
    profitPercent:
      row.profitPercent === null
        ? null
        : normalizeDecimal(row.profitPercent.toString(), 2),
  };
}

@Injectable()
export class PrismaProductCategoryRepository implements ProductCategoryRepository {
  constructor(@Inject(DATABASE_CLIENT) private readonly prisma: PrismaClient) {}

  async list(): Promise<CategoryRecord[]> {
    const rows = await this.prisma.productCategory.findMany({
      select: CATEGORY_SELECT,
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
    return rows.map(toCategoryRecord);
  }

  async findById(id: number): Promise<CategoryRecord | null> {
    const row = await this.prisma.productCategory.findUnique({
      where: { id },
      select: CATEGORY_SELECT,
    });
    return row ? toCategoryRecord(row) : null;
  }

  async create(data: CategoryData): Promise<CategoryRecord> {
    const row = await this.prisma.productCategory.create({
      data,
      select: CATEGORY_SELECT,
    });
    return toCategoryRecord(row);
  }

  async update(
    id: number,
    data: Omit<CategoryData, 'sortOrder'>,
  ): Promise<CategoryRecord> {
    const row = await this.prisma.productCategory.update({
      where: { id },
      data,
      select: CATEGORY_SELECT,
    });
    return toCategoryRecord(row);
  }

  async setAddonCategory(
    id: number,
    addonCategoryId: number | null,
  ): Promise<CategoryRecord> {
    const row = await this.prisma.productCategory.update({
      where: { id },
      data: { addonCategoryId },
      select: CATEGORY_SELECT,
    });
    return toCategoryRecord(row);
  }

  async setChoiceCategory(
    id: number,
    choiceCategoryId: number | null,
  ): Promise<CategoryRecord> {
    const row = await this.prisma.productCategory.update({
      where: { id },
      data: { choiceCategoryId },
      select: CATEGORY_SELECT,
    });
    return toCategoryRecord(row);
  }

  listProductOrder(categoryId: number): Promise<CategoryProductOrder[]> {
    return this.prisma.product.findMany({
      where: { categoryId },
      select: { id: true, name: true, sortOrder: true, active: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  }

  async reorderProducts(ids: number[]): Promise<void> {
    await this.prisma.$transaction(
      ids.map((id, index) =>
        this.prisma.product.update({
          where: { id },
          data: { sortOrder: index + 1 },
        }),
      ),
    );
  }

  async reorder(ids: number[]): Promise<void> {
    await this.prisma.$transaction(
      ids.map((id, index) =>
        this.prisma.productCategory.update({
          where: { id },
          data: { sortOrder: index + 1 },
        }),
      ),
    );
  }
}
