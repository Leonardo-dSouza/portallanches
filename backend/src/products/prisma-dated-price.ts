import { fromDbDate, toDbDate } from '../common/db-date.js';
import type { Prisma } from '../generated/prisma/client.js';
import type { DatedProduct } from './dated-price.js';

/**
 * Campos de produto para vender num dia: o preço de hoje, a situação e a linha do histórico que
 * valia no dia (a de menor `valid_until` >= dia).
 *
 * @example prisma.product.findMany({ select: { id: true, ...datedPriceSelect('2026-10-05') } })
 */
export function datedPriceSelect(businessDate: string) {
  return {
    salePrice: true,
    active: true,
    deactivatedOn: true,
    priceHistory: {
      where: { validUntil: { gte: toDbDate(businessDate) } },
      orderBy: { validUntil: 'asc' },
      take: 1,
      select: { salePrice: true },
    },
  } as const satisfies Prisma.ProductSelect;
}

type DatedRow = Prisma.ProductGetPayload<{
  select: ReturnType<typeof datedPriceSelect>;
}>;

/** Linha lida com `datedPriceSelect` → entrada do `priceOnDate`. */
export function toDatedProduct(row: DatedRow): DatedProduct {
  return {
    salePrice: row.salePrice?.toFixed(2) ?? null,
    active: row.active,
    deactivatedOn: row.deactivatedOn && fromDbDate(row.deactivatedOn),
    supersededPrice: row.priceHistory[0]?.salePrice.toFixed(2) ?? null,
  };
}
