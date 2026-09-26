import type { CellValue, ImportIssue } from '../ticket-import/import-types.js';

/** Célula com o resultado e, se houver, a fórmula (sem o `=`; compartilhadas já traduzidas). */
export interface FormulaCell {
  value: CellValue;
  formula: string | null;
}

/** Uma aba como matriz `grid[linha][coluna]`, ambos a partir de 0. */
export type FormulaGrid = FormulaCell[][];

/** Parte de uma célula de `itens_custos` que um lanche usa: insumo e quantidade (unidade dele). */
export interface PortionPart {
  supply: string;
  quantity: string;
}

export interface MappedSupply {
  name: string;
  countUnit: string;
  /** Célula de `itens_custos` com o preço pago (ex.: `E6` = R$ 39,90 o kg). */
  costCell: string;
  /** Quantas unidades de contagem o preço da `costCell` compra (caixa de 36 → `'36'`). */
  costPer: string;
  deductOnSale: boolean;
  packages: { name: string; quantity: string }[];
}

/** Descrições do cardápio: nome e descrição em colunas de outra aba, casados pelo nome. */
export interface DescriptionSource {
  sheet: string;
  nameColumn: string;
  descriptionColumn: string;
}

/** Faixa de linhas de uma aba de custos que vira produtos de uma categoria. */
export interface ProductGroup {
  sheet: string;
  /** Linhas do Excel (a partir de 1), inclusivas: `'2-26'`. Linhas sem nome são puladas. */
  rows: string;
  category: string;
  descriptions: DescriptionSource | null;
}

/** Arquivo revisável que diz como a planilha vira insumos e composição. */
export interface MenuMapping {
  groups: ProductGroup[];
  supplies: MappedSupply[];
  /** Célula de `itens_custos` (ex.: `F6`, `H44`) → o que ela representa em insumos. */
  portions: Record<string, PortionPart[]>;
}

/**
 * Correções manuais por célula (`"Lanches!F18"`): `"=itens_custos!F15"` troca a fórmula,
 * `"skip"` ignora a célula e qualquer outro texto substitui o valor (ex.: um nome).
 */
export type MenuCorrections = Record<string, string>;

export interface PlannedSupply extends Omit<
  MappedSupply,
  'costCell' | 'costPer'
> {
  nameKey: string;
  unitCost: string;
}

export interface PlannedComponent {
  supplyKey: string;
  quantity: string;
}

export interface PlannedProduct {
  /** Onde está na planilha (`Lanches!10`), para os relatórios. */
  where: string;
  category: string;
  categoryKey: string;
  name: string;
  nameKey: string;
  description: string | null;
  salePrice: string;
  components: PlannedComponent[];
  cmv: string;
}

export interface MenuPlan {
  supplies: PlannedSupply[];
  products: PlannedProduct[];
  issues: ImportIssue[];
}
