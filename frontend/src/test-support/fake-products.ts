import type {
  Product,
  ProductCategory,
  ProductInput,
  SaleMenuItem,
  SaleRemovable,
  Supply,
} from '../api/types';

/**
 * Lanche gravado como o backend devolve: junta o nome da categoria, os dados do insumo e o nome
 * dos itens do combo (CMV fixo em zero).
 *
 * @example fakeProductFrom(input, 7, categories, supplies, products).categoryName // 'Tradicional'
 */
export function fakeProductFrom(
  input: ProductInput,
  id: number,
  categories: ProductCategory[],
  supplies: Supply[],
  products: Product[],
  existing?: Product,
): Product {
  const currentComponents =
    input.components === undefined
      ? (existing?.components ?? [])
      : input.components.map((c) => {
          const supply = supplies.find((s) => s.id === c.supplyId);
          return {
            ...c,
            supplyName: supply?.name ?? '',
            countUnit: supply?.countUnit ?? '',
            unitCost: supply?.unitCost ?? null,
          };
        });
  return {
    ...input,
    id,
    // Como a API: meta ausente no PUT mantém a gravada.
    profitPercent:
      input.profitPercent === undefined
        ? (existing?.profitPercent ?? null)
        : input.profitPercent,
    ifoodPrice:
      input.ifoodPrice === undefined
        ? (existing?.ifoodPrice ?? null)
        : input.ifoodPrice,
    bundleItems: input.bundleItems.map((item) => {
      const product = products.find((p) => p.id === item.productId);
      // Como a API: adicional = a categoria do item é a de adicionais de outra.
      const addon = categories.some(
        (c) => c.addonCategoryId === product?.categoryId,
      );
      return { ...item, productName: product?.name ?? '', addon };
    }),
    categoryName: categories.find((c) => c.id === input.categoryId)?.name ?? '',
    components: currentComponents,
    cmv: existing?.cmv ?? '0.00',
    cmvComplete: existing?.cmvComplete ?? true,
    cmvPercent: existing?.cmvPercent ?? null,
  };
}

/** Só lanche tem o que tirar, como o backend; o fake não separa embalagem. */
function fakeRemovables(product: Product): SaleRemovable[] {
  if (product.menuNumber === null) return [];
  return product.components.map(({ supplyId, supplyName }) => ({
    supplyId,
    name: supplyName,
  }));
}

/**
 * Cardápio do caixa num dia: o configurado para aquele dia (`menus[date]`, para simular o
 * preço antigo de um caixa atrasado; `menus.hoje` sem data) ou, sem configuração, os produtos
 * ativos e com preço.
 *
 * @example fakeMenuForSale(products, {}, null, categories).every((item) => item.salePrice !== null) // true
 */
export function fakeMenuForSale(
  products: Product[],
  menus: Record<string, SaleMenuItem[]>,
  date: string | null,
  categories: ProductCategory[],
): SaleMenuItem[] {
  // Sem data é o caixa de hoje: a chave 'hoje' configura o cardápio dele (ex.: saldo baixo).
  const configured = menus[date ?? 'hoje'];
  if (configured) return configured;
  const addonsOf = (categoryId: number) =>
    categories.find((c) => c.id === categoryId)?.addonCategoryId ?? null;
  const choiceOf = (categoryId: number) =>
    categories.find((c) => c.id === categoryId)?.choiceCategoryId ?? null;
  return products.flatMap((p) =>
    p.active && p.salePrice !== null
      ? [
          {
            id: p.id,
            name: p.name,
            menuNumber: p.menuNumber,
            categoryId: p.categoryId,
            categoryName: p.categoryName,
            addonCategoryId: addonsOf(p.categoryId),
            choiceCategoryId: choiceOf(p.categoryId),
            sortOrder: 0,
            salePrice: p.salePrice,
            ifoodPrice: p.ifoodPrice,
            stockLeft: null,
            removables: fakeRemovables(p),
            bundleItems: p.bundleItems.map((item) => ({
              name: item.productName,
              quantity: item.quantity,
              addon: item.addon,
            })),
          },
        ]
      : [],
  );
}
