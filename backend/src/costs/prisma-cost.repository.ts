import { ConflictException, Inject, Injectable } from '@nestjs/common';
import { normalizeDecimal } from '../common/quantity.js';
import type { Prisma } from '../generated/prisma/client.js';
import { PrismaClient } from '../generated/prisma/client.js';
import { DATABASE_CLIENT } from '../prisma/prisma.service.js';
import { changeProduct } from '../products/prisma-product-change.js';
import {
  IFOOD_COMMISSION_PERCENT_KEY,
  IFOOD_PROFIT_PERCENT_KEY,
  readIfoodSettings,
} from '../settings/ifood-settings.js';
import type {
  CostApplyInput,
  CostHistoryRow,
  CostRepository,
} from './cost-repository.js';
import type {
  CostProduct,
  CostSnapshot,
  CostSupply,
  PricingCategory,
  SupplyRecipe,
} from './cost-types.js';

/** Constante fixa para advisory lock de transações concorrentes de custo. */
export const COST_ADVISORY_LOCK_ID = 20261113;

type SupplyRow = Prisma.SupplyGetPayload<{
  include: { packages: true };
}>;

type RecipeRow = Prisma.SupplyRecipeGetPayload<{
  include: { items: true };
}>;

type ProductRow = Prisma.ProductGetPayload<{
  include: { components: true; bundleItems: true };
}>;

type CategoryRow = Prisma.ProductCategoryGetPayload<Record<string, never>>;

type HistoryRow = Prisma.SupplyCostHistoryGetPayload<{
  include: {
    changeSet: { include: { createdBy: { select: { name: true } } } };
  };
}>;

/**
 * Converte uma linha de insumo do Prisma para o tipo CostSupply.
 *
 * @example toCostSupply(row)
 */
export function toCostSupply(row: SupplyRow): CostSupply {
  return {
    id: row.id,
    name: row.name,
    countUnit: row.countUnit,
    sectionId: row.sectionId,
    unitCost:
      row.unitCost === null
        ? null
        : normalizeDecimal(row.unitCost.toString(), 4),
    basePrice: row.basePrice === null ? null : row.basePrice.toFixed(2),
    baseQuantity:
      row.baseQuantity === null
        ? null
        : normalizeDecimal(row.baseQuantity.toString(), 3),
    baseLabel: row.baseLabel,
    packages: row.packages.map((p) => ({
      name: p.name,
      quantity:
        normalizeDecimal(p.quantity.toString(), 3) ?? p.quantity.toString(),
    })),
  };
}

/**
 * Converte uma linha de ficha técnica do Prisma para SupplyRecipe.
 *
 * @example toSupplyRecipe(row)
 */
export function toSupplyRecipe(row: RecipeRow): SupplyRecipe {
  return {
    supplyId: row.supplyId,
    yieldQuantity:
      normalizeDecimal(row.yieldQuantity.toString(), 3) ??
      row.yieldQuantity.toString(),
    items: row.items.map((item) => ({
      supplyId: item.supplyId,
      quantity:
        normalizeDecimal(item.quantity.toString(), 3) ??
        item.quantity.toString(),
    })),
  };
}

/**
 * Converte uma linha de produto do Prisma para CostProduct.
 *
 * @example toCostProduct(row)
 */
export function toCostProduct(row: ProductRow): CostProduct {
  return {
    id: row.id,
    name: row.name,
    categoryId: row.categoryId,
    menuNumber: row.menuNumber,
    salePrice: row.salePrice === null ? null : row.salePrice.toFixed(2),
    components: row.components.map((c) => ({
      supplyId: c.supplyId,
      quantity:
        normalizeDecimal(c.quantity.toString(), 3) ?? c.quantity.toString(),
    })),
    bundleItems: row.bundleItems.map((b) => ({
      productId: b.itemProductId,
      quantity: b.quantity,
    })),
  };
}

/**
 * Converte uma categoria de precificação do Prisma para PricingCategory.
 *
 * @example toPricingCategory(row)
 */
export function toPricingCategory(row: CategoryRow): PricingCategory {
  return {
    id: row.id,
    name: row.name,
    sortOrder: row.sortOrder,
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

/**
 * Converte o registro de histórico de custo em linha formatada de apresentação.
 *
 * @example toCostHistoryRow(row)
 */
export function toCostHistoryRow(row: HistoryRow): CostHistoryRow {
  return {
    createdAt: row.changeSet.createdAt.toISOString(),
    userName: row.changeSet.createdBy.name,
    oldUnitCost:
      row.oldUnitCost === null
        ? null
        : normalizeDecimal(row.oldUnitCost.toString(), 4),
    newUnitCost:
      row.newUnitCost === null
        ? null
        : normalizeDecimal(row.newUnitCost.toString(), 4),
    oldBasePrice:
      row.oldBasePrice === null ? null : row.oldBasePrice.toFixed(2),
    newBasePrice:
      row.newBasePrice === null ? null : row.newBasePrice.toFixed(2),
    baseQuantity:
      row.baseQuantity === null
        ? null
        : normalizeDecimal(row.baseQuantity.toString(), 3),
    baseLabel: row.baseLabel,
  };
}

/** Garante trava exclusiva e valida se o lote base confere com o último salvo. */
async function assertLockAndLatest(
  tx: Prisma.TransactionClient,
  basedOnChangeSetId: number | null,
): Promise<void> {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(${COST_ADVISORY_LOCK_ID})`;
  const lastSet = await tx.costChangeSet.findFirst({
    orderBy: { id: 'desc' },
    select: { id: true },
  });
  const latestId = lastSet?.id ?? null;
  if (latestId !== basedOnChangeSetId) {
    throw new ConflictException(
      `Os custos mudaram em outro aparelho (salvamento ${latestId}, rascunho de ${basedOnChangeSetId}); recarregue`,
    );
  }
}

/** Atualiza preços base e custos derivados dos insumos citados e recalculados. */
async function updateSupplies(
  tx: Prisma.TransactionClient,
  supplyIds: Set<number>,
  afterSuppliesById: Map<number, CostSupply>,
): Promise<void> {
  for (const id of supplyIds) {
    const after = afterSuppliesById.get(id);
    if (!after) continue;
    await tx.supply.update({
      where: { id },
      data: {
        unitCost: after.unitCost,
        basePrice: after.basePrice,
        baseQuantity: after.baseQuantity,
        baseLabel: after.baseLabel,
      },
    });
  }
}

/** Remove fichas técnicas excluídas e atualiza/insere novas fichas com itens. */
async function updateRecipes(
  tx: Prisma.TransactionClient,
  input: CostApplyInput,
): Promise<void> {
  if (input.changes.removedRecipeSupplyIds.length > 0) {
    await tx.supplyRecipe.deleteMany({
      where: { supplyId: { in: input.changes.removedRecipeSupplyIds } },
    });
  }
  for (const recipe of input.changes.recipes) {
    const existing = await tx.supplyRecipe.findUnique({
      where: { supplyId: recipe.supplyId },
      select: { id: true },
    });
    if (existing) {
      await tx.supplyRecipeItem.deleteMany({
        where: { recipeId: existing.id },
      });
      await tx.supplyRecipe.update({
        where: { id: existing.id },
        data: {
          yieldQuantity: recipe.yieldQuantity,
          items: {
            create: recipe.items.map((i) => ({
              supplyId: i.supplyId,
              quantity: i.quantity,
            })),
          },
        },
      });
    } else {
      await tx.supplyRecipe.create({
        data: {
          supplyId: recipe.supplyId,
          yieldQuantity: recipe.yieldQuantity,
          items: {
            create: recipe.items.map((i) => ({
              supplyId: i.supplyId,
              quantity: i.quantity,
            })),
          },
        },
      });
    }
  }
}

/** Substitui os componentes dos produtos do cardápio citados no lote. */
async function updateComponents(
  tx: Prisma.TransactionClient,
  input: CostApplyInput,
): Promise<void> {
  for (const change of input.changes.components) {
    await tx.productComponent.deleteMany({
      where: { productId: change.productId },
    });
    if (change.components.length > 0) {
      await tx.productComponent.createMany({
        data: change.components.map((item) => ({
          productId: change.productId,
          supplyId: item.supplyId,
          quantity: item.quantity,
        })),
      });
    }
  }
}

/** Grava os novos preços de venda pelo fluxo oficial com histórico datado. */
async function updateSalePrices(
  tx: Prisma.TransactionClient,
  input: CostApplyInput,
): Promise<void> {
  for (const change of input.changes.salePrices) {
    await changeProduct(
      tx,
      { id: change.productId },
      { salePrice: change.salePrice },
      input.today,
    );
  }
}

/** Cria o cabeçalho do change set e registra as linhas de histórico de custos. */
async function recordChangeSetAndHistory(
  tx: Prisma.TransactionClient,
  input: CostApplyInput,
  existingById: Map<number, { id: number; basePrice: Prisma.Decimal | null }>,
  afterSuppliesById: Map<number, CostSupply>,
): Promise<number> {
  const changeSet = await tx.costChangeSet.create({
    data: {
      createdById: input.userId,
      summary: input.summary,
    },
  });
  if (input.supplyChanges.length > 0) {
    await tx.supplyCostHistory.createMany({
      data: input.supplyChanges.map((change) => {
        const existing = existingById.get(change.supplyId);
        const after = afterSuppliesById.get(change.supplyId);
        return {
          changeSetId: changeSet.id,
          supplyId: change.supplyId,
          oldUnitCost: change.before,
          newUnitCost: change.after,
          oldBasePrice: existing?.basePrice
            ? existing.basePrice.toFixed(2)
            : null,
          newBasePrice: after?.basePrice ?? null,
          baseQuantity: after?.baseQuantity ?? null,
          baseLabel: after?.baseLabel ?? null,
        };
      }),
    });
  }
  return changeSet.id;
}

/**
 * Repositório Prisma da área de Custos. Persiste todas as alterações em transação única
 * protegida por pg_advisory_xact_lock para evitar conflitos concorrentes.
 */
@Injectable()
export class PrismaCostRepository implements CostRepository {
  constructor(@Inject(DATABASE_CLIENT) private readonly prisma: PrismaClient) {}

  async loadSnapshot(): Promise<CostSnapshot> {
    const [supplies, recipes, products, categories, settings, lastSet] =
      await Promise.all([
        this.prisma.supply.findMany({
          where: {
            OR: [
              { active: true },
              { components: { some: { product: { active: true } } } },
              { recipe: { isNot: null } },
              { recipeItems: { some: {} } },
            ],
          },
          include: { packages: { orderBy: { name: 'asc' } } },
          orderBy: [{ id: 'asc' }],
        }),
        this.prisma.supplyRecipe.findMany({
          include: { items: { orderBy: { id: 'asc' } } },
          orderBy: [{ id: 'asc' }],
        }),
        this.prisma.product.findMany({
          where: { active: true },
          include: {
            components: { orderBy: { id: 'asc' } },
            bundleItems: { orderBy: { id: 'asc' } },
          },
          orderBy: [
            { category: { sortOrder: 'asc' } },
            { menuNumber: { sort: 'asc', nulls: 'last' } },
            { name: 'asc' },
          ],
        }),
        this.prisma.productCategory.findMany({
          where: { active: true },
          orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        }),
        this.prisma.appSetting.findMany({
          where: {
            key: {
              in: [IFOOD_PROFIT_PERCENT_KEY, IFOOD_COMMISSION_PERCENT_KEY],
            },
          },
        }),
        this.prisma.costChangeSet.findFirst({
          orderBy: { id: 'desc' },
          select: { id: true },
        }),
      ]);

    const settingsMap = new Map(settings.map((s) => [s.key, s.value]));
    return {
      supplies: supplies.map(toCostSupply),
      recipes: recipes.map(toSupplyRecipe),
      products: products.map(toCostProduct),
      categories: categories.map(toPricingCategory),
      ifood: readIfoodSettings(
        settingsMap.get(IFOOD_PROFIT_PERCENT_KEY) ?? null,
        settingsMap.get(IFOOD_COMMISSION_PERCENT_KEY) ?? null,
      ),
      lastChangeSetId: lastSet?.id ?? null,
    };
  }

  async apply(input: CostApplyInput): Promise<number> {
    return this.prisma.$transaction(async (tx) => {
      await assertLockAndLatest(tx, input.basedOnChangeSetId);

      // Quem ganhou ficha perde o preço base mesmo sem mudar de custo: entra na gravação também.
      const supplyIds = new Set([
        ...input.changes.basePrices.map((b) => b.supplyId),
        ...input.changes.recipes.map((r) => r.supplyId),
        ...input.supplyChanges.map((s) => s.supplyId),
      ]);
      const afterSuppliesById = new Map(
        input.after.supplies.map((s) => [s.id, s]),
      );
      const existingSupplies = await tx.supply.findMany({
        where: { id: { in: input.supplyChanges.map((s) => s.supplyId) } },
        select: { id: true, basePrice: true },
      });
      const existingById = new Map(existingSupplies.map((s) => [s.id, s]));

      await updateSupplies(tx, supplyIds, afterSuppliesById);
      await updateRecipes(tx, input);
      await updateComponents(tx, input);
      await updateSalePrices(tx, input);
      return recordChangeSetAndHistory(
        tx,
        input,
        existingById,
        afterSuppliesById,
      );
    });
  }

  async history(supplyId: number): Promise<CostHistoryRow[]> {
    const rows = await this.prisma.supplyCostHistory.findMany({
      where: { supplyId },
      include: {
        changeSet: {
          include: {
            createdBy: { select: { name: true } },
          },
        },
      },
      orderBy: [{ id: 'desc' }],
    });
    return rows.map(toCostHistoryRow);
  }
}
