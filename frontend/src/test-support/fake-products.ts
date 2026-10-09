import type {
  Product,
  ProductCategory,
  ProductInput,
  SaleMenuItem,
  Supply,
} from '../api/types';

/**
 * Lanche gravado como o backend devolve: junta o nome da categoria e os dados do insumo
 * (CMV fixo em zero).
 *
 * @example fakeProductFrom(input, 7, categories, supplies).categoryName // 'Tradicional'
 */
export function fakeProductFrom(
  input: ProductInput,
  id: number,
  categories: ProductCategory[],
  supplies: Supply[],
): Product {
  return {
    ...input,
    id,
    categoryName: categories.find((c) => c.id === input.categoryId)?.name ?? '',
    components: input.components.map((c) => {
      const supply = supplies.find((s) => s.id === c.supplyId);
      return {
        ...c,
        supplyName: supply?.name ?? '',
        countUnit: supply?.countUnit ?? '',
        unitCost: supply?.unitCost ?? null,
      };
    }),
    cmv: '0.00',
    cmvComplete: true,
    cmvPercent: null,
  };
}

/**
 * Cardápio do caixa num dia: o configurado para aquele dia (`menus[date]`, para simular o
 * preço antigo de um caixa atrasado) ou, sem configuração, os produtos ativos e com preço.
 *
 * @example fakeMenuForSale(products, {}, null).every((item) => item.salePrice !== null) // true
 */
export function fakeMenuForSale(
  products: Product[],
  menus: Record<string, SaleMenuItem[]>,
  date: string | null,
): SaleMenuItem[] {
  if (date !== null && menus[date]) return menus[date];
  return products.flatMap(({ id, name, menuNumber, categoryName, ...p }) =>
    p.active && p.salePrice !== null
      ? [{ id, name, menuNumber, categoryName, salePrice: p.salePrice }]
      : [],
  );
}
