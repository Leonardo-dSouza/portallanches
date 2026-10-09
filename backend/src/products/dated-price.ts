/** Produto lido para vender num dia: preço atual, situação e o preço que valia no dia. */
export interface DatedProduct {
  /** Preço de hoje; nulo = sem preço. */
  salePrice: string | null;
  active: boolean;
  deactivatedOn: string | null;
  /** Do histórico: a linha com o menor `valid_until` >= dia; nulo = o preço não mudou desde então. */
  supersededPrice: string | null;
}

export interface PriceOnDate {
  salePrice: string | null;
  sellable: boolean;
}

/**
 * Preço e situação de um produto num dia de negócio. Caixa atrasado lançado depois do reajuste
 * usa o preço da época, e o item que saiu do cardápio depois daquele dia ainda vende nele.
 *
 * @example priceOnDate({ salePrice: '19.90', active: true, deactivatedOn: null, supersededPrice: '17.80' }, '2026-10-05') // { salePrice: '17.80', sellable: true }
 */
export function priceOnDate(
  product: DatedProduct,
  businessDate: string,
): PriceOnDate {
  return {
    salePrice: product.supersededPrice ?? product.salePrice,
    sellable: sellableOn(product, businessDate),
  };
}

function sellableOn(product: DatedProduct, businessDate: string): boolean {
  if (product.active) return true;
  return product.deactivatedOn !== null && product.deactivatedOn > businessDate;
}
