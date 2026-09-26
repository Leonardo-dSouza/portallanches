import { Inject, Injectable } from '@nestjs/common';
import type { Prisma } from '../generated/prisma/client.js';
import { PrismaClient } from '../generated/prisma/client.js';
import { DATABASE_CLIENT } from '../prisma/prisma.service.js';
import type {
  SupplyData,
  SupplyRecord,
  SupplyRepository,
} from './supply-repository.js';

const WITH_PACKAGES = {
  include: { packages: { orderBy: { quantity: 'asc' } } },
} as const;

type SupplyRow = Prisma.SupplyGetPayload<typeof WITH_PACKAGES>;

/** Decimal do banco → texto sem zeros à direita ('36.000' → '36'), como o parser devolve. */
const toQuantity = (value: Prisma.Decimal): string => value.toString();

const toSupply = (row: SupplyRow): SupplyRecord => ({
  id: row.id,
  name: row.name,
  countUnit: row.countUnit,
  minStock: row.minStock === null ? null : toQuantity(row.minStock),
  unitCost: row.unitCost === null ? null : row.unitCost.toString(),
  deductOnSale: row.deductOnSale,
  active: row.active,
  packages: row.packages.map((p) => ({
    name: p.name,
    quantity: toQuantity(p.quantity),
  })),
});

function scalarFields(data: SupplyData) {
  const { packages: _packages, ...fields } = data;
  return fields;
}

@Injectable()
export class PrismaSupplyRepository implements SupplyRepository {
  constructor(@Inject(DATABASE_CLIENT) private readonly prisma: PrismaClient) {}

  async list(): Promise<SupplyRecord[]> {
    const rows = await this.prisma.supply.findMany({
      ...WITH_PACKAGES,
      orderBy: { name: 'asc' },
    });
    return rows.map(toSupply);
  }

  async exists(id: number): Promise<boolean> {
    return (await this.prisma.supply.count({ where: { id } })) > 0;
  }

  async create(data: SupplyData): Promise<SupplyRecord> {
    const row = await this.prisma.supply.create({
      data: { ...scalarFields(data), packages: { create: data.packages } },
      ...WITH_PACKAGES,
    });
    return toSupply(row);
  }

  async update(id: number, data: SupplyData): Promise<SupplyRecord> {
    const row = await this.prisma.supply.update({
      where: { id },
      data: {
        ...scalarFields(data),
        packages: { deleteMany: {}, create: data.packages },
      },
      ...WITH_PACKAGES,
    });
    return toSupply(row);
  }
}
