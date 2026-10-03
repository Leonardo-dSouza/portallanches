import type { PrismaClient } from '../generated/prisma/client.js';
import type {
  ExistingProduct,
  MenuImportTarget,
  MenuSnapshot,
} from './menu-import-target.js';
import { productsLeavingSheet } from './menu-diff.js';
import { packageWrites } from './package-writes.js';
import type {
  ImportSource,
  MenuPlan,
  PlannedProduct,
  PlannedSupply,
} from './menu-types.js';

type Tx = Parameters<Parameters<PrismaClient['$transaction']>[0]>[0];

const TRANSACTION_TIMEOUT_MS = 60_000;

const PRODUCT_DETAILS = {
  include: {
    category: { select: { nameKey: true, name: true } },
    components: {
      include: { supply: { select: { nameKey: true } } },
      orderBy: { id: 'asc' },
    },
  },
} as const;

/** Insumo existente: a planilha atualiza só custo e as embalagens dela (nome, unidade e baixa ficam). */
async function upsertSupply(tx: Tx, supply: PlannedSupply): Promise<void> {
  const packages = packageWrites(supply.packages);
  await tx.supply.upsert({
    where: { nameKey: supply.nameKey },
    update: { unitCost: supply.unitCost, packages },
    create: {
      name: supply.name,
      nameKey: supply.nameKey,
      countUnit: supply.countUnit,
      unitCost: supply.unitCost,
      deductOnSale: supply.deductOnSale,
      packages: { create: supply.packages },
    },
  });
}

async function idsByKey(tx: Tx, keys: string[]): Promise<Map<string, number>> {
  const rows = await tx.supply.findMany({
    where: { nameKey: { in: keys } },
    select: { id: true, nameKey: true },
  });
  return new Map(rows.map((row) => [row.nameKey, row.id]));
}

interface ProductWrite {
  categoryId: number;
  supplyIds: Map<string, number>;
  source: ImportSource;
}

/**
 * Produto da planilha passa a ser dela (mesmo se foi cadastrado à mão). O `active` não é
 * tocado: quem o admin desativou continua desativado na reimportação (sessão 7: só algumas
 * bebidas da planilha ficam à venda).
 */
async function upsertProduct(
  tx: Tx,
  product: PlannedProduct,
  { categoryId, supplyIds, source }: ProductWrite,
): Promise<void> {
  const fields = {
    name: product.name,
    menuNumber: product.menuNumber,
    description: product.description,
    salePrice: product.salePrice,
    importSource: source,
  };
  const components = product.components.map((c) => ({
    supplyId: supplyIds.get(c.supplyKey)!,
    quantity: c.quantity,
  }));
  await tx.product.upsert({
    where: { categoryId_nameKey: { categoryId, nameKey: product.nameKey } },
    update: { ...fields, components: { deleteMany: {}, create: components } },
    create: {
      ...fields,
      categoryId,
      nameKey: product.nameKey,
      components: { create: components },
    },
  });
}

const IMPORT_SOURCES: ImportSource[] = ['cardapio', 'bebidas'];

function toImportSource(value: string | null): ImportSource | null {
  return IMPORT_SOURCES.find((source) => source === value) ?? null;
}

async function deactivateProducts(
  tx: Tx,
  products: ExistingProduct[],
  categoryIds: Map<string, number>,
): Promise<void> {
  for (const p of products)
    await tx.product.update({
      where: {
        categoryId_nameKey: {
          categoryId: categoryIds.get(p.categoryKey)!,
          nameKey: p.nameKey,
        },
      },
      data: { active: false },
    });
}

export class PrismaMenuImportTarget implements MenuImportTarget {
  constructor(private readonly prisma: PrismaClient) {}

  async loadSnapshot(): Promise<MenuSnapshot> {
    const [supplies, categories, products] = await Promise.all([
      this.prisma.supply.findMany({
        select: { name: true, nameKey: true, countUnit: true, unitCost: true },
      }),
      this.prisma.productCategory.findMany({ select: { nameKey: true } }),
      this.prisma.product.findMany(PRODUCT_DETAILS),
    ]);
    return {
      supplies: supplies.map((s) => ({
        ...s,
        unitCost: s.unitCost?.toString() ?? null,
      })),
      categoryKeys: categories.map((c) => c.nameKey),
      products: products.map((p): ExistingProduct => ({
        categoryKey: p.category.nameKey,
        categoryName: p.category.name,
        active: p.active,
        importSource: toImportSource(p.importSource),
        nameKey: p.nameKey,
        name: p.name,
        menuNumber: p.menuNumber,
        salePrice: p.salePrice?.toFixed(2) ?? null,
        description: p.description,
        components: p.components.map((c) => ({
          supplyKey: c.supply.nameKey,
          quantity: c.quantity.toString(),
        })),
      })),
    };
  }

  async write(plan: MenuPlan): Promise<void> {
    const leaving = productsLeavingSheet(plan, await this.loadSnapshot());
    await this.prisma.$transaction(
      async (tx) => {
        for (const supply of plan.supplies) await upsertSupply(tx, supply);
        const supplyIds = await idsByKey(
          tx,
          plan.supplies.map((s) => s.nameKey),
        );
        const categories = await tx.productCategory.findMany();
        const categoryIds = new Map(categories.map((c) => [c.nameKey, c.id]));
        for (const product of plan.products)
          await upsertProduct(tx, product, {
            categoryId: categoryIds.get(product.categoryKey)!,
            supplyIds,
            source: plan.source,
          });
        await deactivateProducts(tx, leaving, categoryIds);
      },
      { timeout: TRANSACTION_TIMEOUT_MS },
    );
  }
}
