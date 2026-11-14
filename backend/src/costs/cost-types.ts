/** Item de uma ficha técnica: insumo utilizado e sua quantidade na unidade de contagem. */
export interface RecipeItem {
  supplyId: number;
  quantity: string;
}

/** Ficha técnica de produção de um insumo artesanal, com rendimento e ingredientes. */
export interface SupplyRecipe {
  supplyId: number;
  yieldQuantity: string;
  items: RecipeItem[];
}

/** Insumo com custos base, embalagens de compra e custo unitário derivado. */
export interface CostSupply {
  id: number;
  name: string;
  countUnit: string;
  unitCost: string | null;
  basePrice: string | null;
  baseQuantity: string | null;
  baseLabel: string | null;
  packages: { name: string; quantity: string }[];
}

/** Produto do cardápio com componentes de ficha, itens de combo e preço de venda. */
export interface CostProduct {
  id: number;
  name: string;
  categoryId: number;
  menuNumber: number | null;
  salePrice: string | null;
  components: RecipeItem[];
  bundleItems: { productId: number; quantity: number }[];
}

/** Categoria de precificação com percentuais de custo fixo e margem de lucro. */
export interface PricingCategory {
  id: number;
  name: string;
  sortOrder: number;
  fixedCostPercent: string | null;
  profitPercent: string | null;
}

/** Parâmetros de precificação para canais de entrega como iFood. */
export interface IfoodPricing {
  profitPercent: string;
  commissionPercent: string;
}

/** Fotografia completa do estado da área de custos para cálculo e projeções. */
export interface CostSnapshot {
  supplies: CostSupply[];
  recipes: SupplyRecipe[];
  products: CostProduct[];
  categories: PricingCategory[];
  ifood: IfoodPricing;
  lastChangeSetId: number | null;
}
