import { Inject, Injectable } from '@nestjs/common';
import type { Prisma } from '../generated/prisma/client.js';
import { PrismaClient } from '../generated/prisma/client.js';
import { DATABASE_CLIENT } from '../prisma/prisma.service.js';
import { pickSaleProduct, type SaleProductRecord } from './sale-product.js';
import type {
  SupplyData,
  SupplyRecord,
  SupplyRepository,
  SupplySectionRecord,
} from './supply-repository.js';

/** Produtos que usam o insumo, com o necessário para achar o produto 1:1 (`pickSaleProduct`). */
const SALE_CANDIDATES = {
  select: {
    quantity: true,
    product: {
      select: {
        id: true,
        name: true,
        salePrice: true,
        importSource: true,
        active: true,
        _count: { select: { components: true } },
      },
    },
  },
} as const satisfies Prisma.Supply$componentsArgs;

const WITH_DETAILS = {
  include: {
    packages: { orderBy: { quantity: 'asc' } },
    components: SALE_CANDIDATES,
  },
} as const;

type SupplyRow = Prisma.SupplyGetPayload<typeof WITH_DETAILS>;
type CandidateRow = SupplyRow['components'][number];

/** Decimal do banco → texto sem zeros à direita ('36.000' → '36'), como o parser devolve. */
const toQuantity = (value: Prisma.Decimal): string => value.toString();

const saleProductOf = (rows: CandidateRow[]): SaleProductRecord | null =>
  pickSaleProduct(
    rows.map(({ quantity, product }) => ({
      id: product.id,
      name: product.name,
      salePrice: product.salePrice?.toFixed(2) ?? null,
      importSource: product.importSource,
      active: product.active,
      quantity: toQuantity(quantity),
      componentCount: product._count.components,
    })),
  );

const toSupply = (row: SupplyRow): SupplyRecord => ({
  id: row.id,
  name: row.name,
  countUnit: row.countUnit,
  minStock: row.minStock === null ? null : toQuantity(row.minStock),
  unitCost: row.unitCost === null ? null : row.unitCost.toString(),
  deductOnSale: row.deductOnSale,
  dailyCount: row.dailyCount,
  sectionId: row.sectionId,
  active: row.active,
  packages: row.packages.map((p) => ({
    name: p.name,
    quantity: toQuantity(p.quantity),
  })),
  saleProduct: saleProductOf(row.components),
});

function scalarFields(data: SupplyData) {
  const { packages: _packages, salePrice: _price, ...fields } = data;
  return fields;
}

@Injectable()
export class PrismaSupplyRepository implements SupplyRepository {
  constructor(@Inject(DATABASE_CLIENT) private readonly prisma: PrismaClient) {}

  listSections(): Promise<SupplySectionRecord[]> {
    return this.prisma.supplySection.findMany({
      select: { id: true, name: true, sortOrder: true, active: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  }

  async sectionExists(sectionId: number): Promise<boolean> {
    const found = await this.prisma.supplySection.count({
      where: { id: sectionId },
    });
    return found > 0;
  }

  async list(): Promise<SupplyRecord[]> {
    const rows = await this.prisma.supply.findMany({
      ...WITH_DETAILS,
      orderBy: { name: 'asc' },
    });
    return rows.map(toSupply);
  }

  async exists(id: number): Promise<boolean> {
    return (await this.prisma.supply.count({ where: { id } })) > 0;
  }

  async findSaleProduct(id: number): Promise<SaleProductRecord | null> {
    const rows = await this.prisma.productComponent.findMany({
      where: { supplyId: id },
      ...SALE_CANDIDATES,
    });
    return saleProductOf(rows);
  }

  async create(data: SupplyData): Promise<SupplyRecord> {
    const row = await this.prisma.supply.create({
      data: { ...scalarFields(data), packages: { create: data.packages } },
      ...WITH_DETAILS,
    });
    return toSupply(row);
  }

  update(id: number, data: SupplyData): Promise<SupplyRecord> {
    return this.prisma.$transaction(async (tx) => {
      if (data.salePrice !== undefined)
        await saveSalePrice(tx, id, data.salePrice);
      const row = await tx.supply.update({
        where: { id },
        data: {
          ...scalarFields(data),
          packages: { deleteMany: {}, create: data.packages },
        },
        ...WITH_DETAILS,
      });
      return toSupply(row);
    });
  }
}

/** Grava o preço no produto 1:1; o service já garantiu que ele existe. */
async function saveSalePrice(
  tx: Prisma.TransactionClient,
  supplyId: number,
  salePrice: string | null,
): Promise<void> {
  const rows = await tx.productComponent.findMany({
    where: { supplyId },
    ...SALE_CANDIDATES,
  });
  const product = saleProductOf(rows);
  if (!product) return;
  await tx.product.update({ where: { id: product.id }, data: { salePrice } });
}
