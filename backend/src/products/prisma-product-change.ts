import { fromDbDate, toDbDate } from '../common/db-date.js';
import type { Prisma } from '../generated/prisma/client.js';
import {
  planProductChange,
  type ProductChange,
  type TrackedProduct,
} from './product-change.js';

/** Campos que a gravação precisa ler antes de mudar preço ou ativo. */
export const TRACKED_SELECT = {
  id: true,
  salePrice: true,
  active: true,
  deactivatedOn: true,
} as const satisfies Prisma.ProductSelect;

export type TrackedRow = Prisma.ProductGetPayload<{
  select: typeof TRACKED_SELECT;
}>;

const toTracked = (row: TrackedRow): TrackedProduct => ({
  salePrice: row.salePrice?.toFixed(2) ?? null,
  active: row.active,
  deactivatedOn: row.deactivatedOn && fromDbDate(row.deactivatedOn),
});

/**
 * Único caminho de gravação de preço e ativo de um produto que já existe (tela, importação e
 * preço pelo insumo): guarda o preço que deixa de valer e devolve o `deactivatedOn` que a
 * gravação do produto deve levar. `skipDuplicates`: a 2ª troca no mesmo dia mantém o original.
 *
 * @example const { deactivatedOn } = await recordProductChange(tx, before, { salePrice: '19.90' }, '2026-10-10');
 */
export async function recordProductChange(
  tx: Prisma.TransactionClient,
  before: TrackedRow,
  change: ProductChange,
  today: string,
): Promise<{ deactivatedOn: Date | null }> {
  const plan = planProductChange(toTracked(before), change, today);
  if (plan.superseded) {
    const { salePrice, validUntil } = plan.superseded;
    await tx.productPriceHistory.createMany({
      data: [
        { productId: before.id, salePrice, validUntil: toDbDate(validUntil) },
      ],
      skipDuplicates: true,
    });
  }
  const { deactivatedOn } = plan;
  return {
    deactivatedOn: deactivatedOn === null ? null : toDbDate(deactivatedOn),
  };
}

/**
 * Muda só o preço e/ou o ativo de um produto passando pelo histórico (preço pelo insumo e
 * desativação na reimportação).
 *
 * @example await changeProduct(tx, { id: 9 }, { salePrice: '19.90' }, '2026-10-10');
 */
export async function changeProduct(
  tx: Prisma.TransactionClient,
  where: Prisma.ProductWhereUniqueInput,
  change: ProductChange,
  today: string,
): Promise<void> {
  const before = await tx.product.findUniqueOrThrow({
    where,
    select: TRACKED_SELECT,
  });
  const { deactivatedOn } = await recordProductChange(
    tx,
    before,
    change,
    today,
  );
  await tx.product.update({ where, data: { ...change, deactivatedOn } });
}
