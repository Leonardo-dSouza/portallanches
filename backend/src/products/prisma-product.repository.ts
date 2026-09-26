import { Inject, Injectable } from '@nestjs/common';
import type { Prisma } from '../generated/prisma/client.js';
import { PrismaClient } from '../generated/prisma/client.js';
import { DATABASE_CLIENT } from '../prisma/prisma.service.js';
import type {
  ProductCategoryRecord,
  ProductData,
  ProductRecord,
  ProductRepository,
} from './product-repository.js';

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

function scalarFields(data: ProductData) {
  const { components: _components, ...fields } = data;
  return fields;
}

const componentsOf = (data: ProductData) =>
  data.components.map((c) => ({ supplyId: c.supplyId, quantity: c.quantity }));

@Injectable()
export class PrismaProductRepository implements ProductRepository {
  constructor(@Inject(DATABASE_CLIENT) private readonly prisma: PrismaClient) {}

  listCategories(): Promise<ProductCategoryRecord[]> {
    return this.prisma.productCategory.findMany({
      select: { id: true, name: true, sortOrder: true, active: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  }

  async list(): Promise<ProductRecord[]> {
    const rows = await this.prisma.product.findMany({
      ...WITH_DETAILS,
      orderBy: [
        { category: { sortOrder: 'asc' } },
        { menuNumber: { sort: 'asc', nulls: 'last' } },
        { name: 'asc' },
      ],
    });
    return rows.map(toProduct);
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

  async update(id: number, data: ProductData): Promise<ProductRecord> {
    const row = await this.prisma.product.update({
      where: { id },
      data: {
        ...scalarFields(data),
        components: { deleteMany: {}, create: componentsOf(data) },
      },
      ...WITH_DETAILS,
    });
    return toProduct(row);
  }
}
