import type { ImportSource, MenuPlan, PlannedComponent } from './menu-types.js';

export interface ExistingSupply {
  nameKey: string;
  name: string;
  countUnit: string;
  unitCost: string | null;
}

export interface ExistingProduct {
  categoryKey: string;
  categoryName: string;
  nameKey: string;
  name: string;
  menuNumber: number | null;
  salePrice: string | null;
  description: string | null;
  components: PlannedComponent[];
  active: boolean;
  /** Nulo = cadastrado à mão (a importação nunca desativa). */
  importSource: ImportSource | null;
}

/** O que já está no banco, para comparar com o plano (a planilha sempre vence). */
export interface MenuSnapshot {
  supplies: ExistingSupply[];
  categoryKeys: string[];
  products: ExistingProduct[];
}

/** Onde o plano é gravado; a implementação real usa o Prisma (`prisma-menu-import.target.ts`). */
export interface MenuImportTarget {
  loadSnapshot(): Promise<MenuSnapshot>;
  /**
   * Grava tudo numa transação: ou entra a planilha inteira, ou nada. Produtos da mesma
   * origem (`plan.source`) que sumiram da planilha são desativados.
   */
  write(plan: MenuPlan): Promise<void>;
}
