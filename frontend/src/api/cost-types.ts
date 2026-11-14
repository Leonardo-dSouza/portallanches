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
  sectionId: number | null;
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

/** Alteração de preço base de um insumo vinda de rascunho de custos. */
export interface BasePriceChange {
  supplyId: number;
  basePrice: string | null;
  baseQuantity: string;
  baseLabel: string | null;
}

/** Alteração na composição de insumos de um produto do cardápio. */
export interface ComponentsChange {
  productId: number;
  components: RecipeItem[];
}

/** Preço de venda alterado para um produto do cardápio. */
export interface SalePriceChange {
  productId: number;
  salePrice: string;
}

/** Conjunto de alterações submetidas em um rascunho de custos. */
export interface CostChanges {
  basePrices: BasePriceChange[];
  recipes: SupplyRecipe[];
  removedRecipeSupplyIds: number[];
  components: ComponentsChange[];
  salePrices: SalePriceChange[];
}

/** Visão calculada de custo, margem e preços sugeridos de um produto. */
export interface ProductCostView {
  id: number;
  name: string;
  categoryId: number;
  menuNumber: number | null;
  salePrice: string | null;
  cmv: string;
  cmvComplete: boolean;
  cmvPercent: string | null;
  pv: string | null;
  ifoodPv: string | null;
  profit: string | null;
  marginPercent: string | null;
  belowTarget: boolean;
}

/** Comparativo antes e depois do custo unitário de um insumo. */
export interface SupplyCostChange {
  supplyId: number;
  name: string;
  before: string | null;
  after: string | null;
}

/** Comparativo antes e depois de um produto afetado por mudanças de custo. */
export interface ProductImpact {
  before: ProductCostView;
  after: ProductCostView;
}

/** Impacto consolidado de um conjunto de mudanças de custo em insumos e produtos. */
export interface CostImpact {
  supplies: SupplyCostChange[];
  products: ProductImpact[];
  becameBelowTarget: number;
}

/** Visão completa da planilha de custos retornada por GET /costs. */
export interface CostSheetView {
  snapshot: CostSnapshot;
  products: ProductCostView[];
  incompleteSupplyIds: number[];
}

/** Prévia do rascunho com o impacto calculado retornada por POST /costs/preview. */
export type CostPreview = CostSheetView & { impact: CostImpact };

/** Linha do histórico de preços base e custos unitários de um insumo. */
export interface CostHistoryRow {
  createdAt: string;
  userName: string;
  oldUnitCost: string | null;
  newUnitCost: string | null;
  oldBasePrice: string | null;
  newBasePrice: string | null;
  baseQuantity: string | null;
  baseLabel: string | null;
}

/** Resposta do salvamento das alterações de custo. */
export interface ApplyCostResult {
  changeSetId: number;
}
