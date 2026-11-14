import { ConflictException } from '@nestjs/common';
import type {
  CostApplyInput,
  CostHistoryRow,
  CostRepository,
} from './cost-repository.js';
import type {
  CostProduct,
  CostSnapshot,
  CostSupply,
  PricingCategory,
  SupplyRecipe,
} from './cost-types.js';

/**
 * Ficha padrão de hambúrguer artesanal usada nos testes (rende 28 unidades).
 * Ingredientes:
 * - 1: acém (2 kg)
 * - 2: gordura de costela (0.5 kg)
 * - 3: costela (1.5 kg)
 * - 4: creme de cebola (1 un)
 */
export const burgerRecipe: SupplyRecipe = {
  supplyId: 10,
  yieldQuantity: '28',
  items: [
    { supplyId: 1, quantity: '2' },
    { supplyId: 2, quantity: '0.5' },
    { supplyId: 3, quantity: '1.5' },
    { supplyId: 4, quantity: '1' },
  ],
};

/** Preços unitários padrão dos insumos do hambúrguer. */
export const costsById = new Map<number, string>([
  [1, '36.90'],
  [2, '45.86'],
  [3, '45.86'],
  [4, '7.90'],
]);

/**
 * Preços dos insumos do hambúrguer sem o creme de cebola (id 4),
 * para simular ficha com insumo sem custo cadastrado.
 */
export const costsWithoutCreme = new Map<number, string>([
  [1, '36.90'],
  [2, '45.86'],
  [3, '45.86'],
]);

/**
 * Constrói função de consulta de custo a partir de um Map de insumos para testes.
 *
 * @example createCostLookup(costsById)(1) // '36.90'
 */
export function createCostLookup(
  costs: Map<number, string>,
): (supplyId: number) => string | null {
  return (supplyId: number): string | null => {
    return costs.get(supplyId) ?? null;
  };
}

/** Insumos com base e custos unitários alinhados com a planilha de custos. */
function buildFixtureSupplies(): CostSupply[] {
  // Contas à mão:
  // Acém: 36.90 / 1 = '36.90'
  // Gordura: 45.86 / 1 = '45.86'
  // Costela: 45.86 / 1 = '45.86'
  // Creme: 7.90 / 1 = '7.90'
  // Hambúrguer: (2*36.90 + 0.5*45.86 + 1.5*45.86 + 1*7.90) / 28 = 173.42 / 28 = '6.1936'
  // Pão: 25.00 / 20 = '1.25'
  // Alface: sem custo cadastrado (null)
  return [
    {
      id: 1,
      name: 'Acém',
      countUnit: 'kg',
      sectionId: null,
      unitCost: '36.90',
      basePrice: '36.90',
      baseQuantity: '1',
      baseLabel: null,
      packages: [],
    },
    {
      id: 2,
      name: 'Gordura de costela',
      countUnit: 'kg',
      sectionId: null,
      unitCost: '45.86',
      basePrice: '45.86',
      baseQuantity: '1',
      baseLabel: null,
      packages: [],
    },
    {
      id: 3,
      name: 'Costela',
      countUnit: 'kg',
      sectionId: null,
      unitCost: '45.86',
      basePrice: '45.86',
      baseQuantity: '1',
      baseLabel: null,
      packages: [],
    },
    {
      id: 4,
      name: 'Creme de cebola',
      countUnit: 'un',
      sectionId: null,
      unitCost: '7.90',
      basePrice: '7.90',
      baseQuantity: '1',
      baseLabel: null,
      packages: [],
    },
    {
      id: 10,
      name: 'Hambúrguer artesanal de carne',
      countUnit: 'un',
      sectionId: null,
      unitCost: '6.1936',
      basePrice: null,
      baseQuantity: null,
      baseLabel: null,
      packages: [],
    },
    {
      id: 5,
      name: 'Pão',
      countUnit: 'un',
      sectionId: null,
      unitCost: '1.25',
      basePrice: '25.00',
      baseQuantity: '20',
      baseLabel: null,
      packages: [],
    },
    {
      id: 6,
      name: 'Alface',
      countUnit: 'kg',
      sectionId: null,
      unitCost: null,
      basePrice: null,
      baseQuantity: null,
      baseLabel: null,
      packages: [],
    },
  ];
}

/** Produtos de teste: lanche simples, bebida e combo de lanches. */
function buildFixtureProducts(): CostProduct[] {
  return [
    {
      id: 1,
      name: 'X Salada artesanal',
      categoryId: 1,
      menuNumber: 1,
      salePrice: '28.00',
      components: [
        { supplyId: 10, quantity: '1' },
        { supplyId: 5, quantity: '1' },
        { supplyId: 6, quantity: '0.02' },
      ],
      bundleItems: [],
    },
    {
      id: 2,
      name: 'Refrigerante lata',
      categoryId: 2,
      menuNumber: 2,
      salePrice: '6.00',
      components: [],
      bundleItems: [],
    },
    {
      id: 3,
      name: 'Combo',
      categoryId: 1,
      menuNumber: 3,
      salePrice: null,
      components: [],
      bundleItems: [{ productId: 1, quantity: 2 }],
    },
  ];
}

/** Categorias de precificação padrão com percentuais artesanais e nulos. */
function buildFixtureCategories(): PricingCategory[] {
  return [
    {
      id: 1,
      name: 'Artesanal',
      sortOrder: 1,
      fixedCostPercent: '41.07',
      profitPercent: '12',
    },
    {
      id: 2,
      name: 'Refrigerantes',
      sortOrder: 2,
      fixedCostPercent: null,
      profitPercent: null,
    },
  ];
}

/**
 * Cria uma fotografia isolada e fresca do estado de custos para testes.
 *
 * @example const snapshot = costSnapshotFixture();
 */
export function costSnapshotFixture(): CostSnapshot {
  return {
    supplies: buildFixtureSupplies(),
    recipes: [
      {
        supplyId: 10,
        yieldQuantity: '28',
        items: [
          { supplyId: 1, quantity: '2' },
          { supplyId: 2, quantity: '0.5' },
          { supplyId: 3, quantity: '1.5' },
          { supplyId: 4, quantity: '1' },
        ],
      },
    ],
    products: buildFixtureProducts(),
    categories: buildFixtureCategories(),
    ifood: { profitPercent: '10', commissionPercent: '28' },
    lastChangeSetId: 7,
  };
}

interface RecordedChangeSet {
  id: number;
  userId: number;
  summary: string;
  createdAt: string;
}

interface RecordedHistory {
  id: number;
  changeSetId: number;
  supplyId: number;
  userName: string;
  createdAt: string;
  oldUnitCost: string | null;
  newUnitCost: string | null;
  oldBasePrice: string | null;
  newBasePrice: string | null;
  baseQuantity: string | null;
  baseLabel: string | null;
}

/** Repositório de custos falso em memória para testes unitários de serviço. */
export class FakeCostRepository implements CostRepository {
  private snapshot: CostSnapshot;
  public readonly recordedChangeSets: RecordedChangeSet[] = [];
  public readonly recordedHistories: RecordedHistory[] = [];
  private nextId = 8;

  constructor(initial: CostSnapshot = costSnapshotFixture()) {
    this.snapshot = structuredClone(initial);
  }

  async loadSnapshot(): Promise<CostSnapshot> {
    return structuredClone(this.snapshot);
  }

  async apply(input: CostApplyInput): Promise<number> {
    if (input.basedOnChangeSetId !== this.snapshot.lastChangeSetId) {
      throw new ConflictException(
        `Os custos mudaram em outro aparelho (salvamento ${this.snapshot.lastChangeSetId}, rascunho de ${input.basedOnChangeSetId}); recarregue`,
      );
    }
    const changeSetId = this.nextId++;
    const nowIso = new Date().toISOString();
    this.recordedChangeSets.push({
      id: changeSetId,
      userId: input.userId,
      summary: input.summary,
      createdAt: nowIso,
    });
    const beforeSuppliesById = new Map(
      this.snapshot.supplies.map((s) => [s.id, s]),
    );
    const afterSuppliesById = new Map(
      input.after.supplies.map((s) => [s.id, s]),
    );

    for (const change of input.supplyChanges) {
      const beforeSupply = beforeSuppliesById.get(change.supplyId);
      const afterSupply = afterSuppliesById.get(change.supplyId);
      this.recordedHistories.push({
        id: this.recordedHistories.length + 1,
        changeSetId,
        supplyId: change.supplyId,
        userName: 'Admin',
        createdAt: nowIso,
        oldUnitCost: change.before,
        newUnitCost: change.after,
        oldBasePrice: beforeSupply?.basePrice ?? null,
        newBasePrice: afterSupply?.basePrice ?? null,
        baseQuantity: afterSupply?.baseQuantity ?? null,
        baseLabel: afterSupply?.baseLabel ?? null,
      });
    }
    this.snapshot = structuredClone(input.after);
    this.snapshot.lastChangeSetId = changeSetId;
    return changeSetId;
  }

  async history(supplyId: number): Promise<CostHistoryRow[]> {
    return this.recordedHistories
      .filter((h) => h.supplyId === supplyId)
      .sort((a, b) => b.id - a.id)
      .map((h) => ({
        createdAt: h.createdAt,
        userName: h.userName,
        oldUnitCost: h.oldUnitCost,
        newUnitCost: h.newUnitCost,
        oldBasePrice: h.oldBasePrice,
        newBasePrice: h.newBasePrice,
        baseQuantity: h.baseQuantity,
        baseLabel: h.baseLabel,
      }));
  }
}
