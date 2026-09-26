import type { MenuPlan, PlannedComponent } from './menu-types.js';

export interface ExistingSupply {
  nameKey: string;
  name: string;
  countUnit: string;
  unitCost: string | null;
}

export interface ExistingProduct {
  categoryKey: string;
  nameKey: string;
  name: string;
  salePrice: string | null;
  description: string | null;
  components: PlannedComponent[];
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
  /** Grava tudo numa transação: ou entra o cardápio inteiro, ou nada. */
  write(plan: MenuPlan): Promise<void>;
}
