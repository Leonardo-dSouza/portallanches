import { ApiError, type HttpMethod } from '../api/api-client';
import type {
  ApplyCostResult,
  CostChanges,
  CostHistoryRow,
  CostPreview,
  CostSheetView,
} from '../api/cost-types';

/** Snapshot inicial com os 4 itens pedidos: acém, hambúrguer produzido, pão e X Salada. */
export function createDefaultCostSheet(): CostSheetView {
  return {
    snapshot: {
      supplies: [
        {
          id: 1,
          name: 'Acém',
          sectionId: 1,
          countUnit: 'kg',
          unitCost: '39.9000',
          basePrice: '39.90',
          baseQuantity: '1',
          baseLabel: 'kg',
          packages: [{ name: 'kg', quantity: '1' }],
        },
        {
          id: 2,
          name: 'Hambúrguer artesanal carne',
          sectionId: null,
          countUnit: 'un',
          unitCost: '5.9900',
          basePrice: null,
          baseQuantity: null,
          baseLabel: null,
          packages: [],
        },
        {
          id: 3,
          name: 'Pão de hambúrguer',
          sectionId: 3,
          countUnit: 'un',
          unitCost: '1.4000',
          basePrice: '1.40',
          baseQuantity: '1',
          baseLabel: 'un',
          packages: [{ name: 'un', quantity: '1' }],
        },
      ],
      recipes: [
        {
          supplyId: 2,
          yieldQuantity: '10',
          items: [{ supplyId: 1, quantity: '1.5' }],
        },
      ],
      products: [
        {
          id: 10,
          name: 'X Salada',
          categoryId: 1,
          menuNumber: 1,
          salePrice: '33.80',
          profitPercent: null,
          components: [
            { supplyId: 2, quantity: '1' },
            { supplyId: 3, quantity: '1' },
          ],
          bundleItems: [],
        },
      ],
      categories: [
        {
          id: 1,
          name: 'Artesanal',
          sortOrder: 1,
          fixedCostPercent: '36.00',
          profitPercent: '22.00',
        },
      ],
      ifood: {
        profitPercent: '22.00',
        commissionPercent: '12.00',
      },
      lastChangeSetId: 1,
    },
    products: [
      {
        id: 10,
        name: 'X Salada',
        categoryId: 1,
        menuNumber: 1,
        salePrice: '33.80',
        cmv: '7.39',
        cmvComplete: true,
        cmvPercent: '21.8',
        pv: '30.80',
        ifoodPv: '35.00',
        profit: '7.44',
        marginPercent: '22.0',
        profitTarget: '22',
        ownProfitTarget: false,
        targetStatus: 'ok',
        belowTarget: false,
      },
    ],
    incompleteSupplyIds: [],
  };
}

/** Estado em memória da área de custos para testes unitários e de integração. */
export class FakeCostData {
  sheet: CostSheetView = createDefaultCostSheet();
  conflictOnApply = false;
  errorOnApply: string | null = null;
  historyRows: CostHistoryRow[] = [];
  lastAppliedChanges: {
    changes: CostChanges;
    basedOnChangeSetId: number | null;
  } | null = null;
  nextChangeSetId = 2;
}

function fakePreview(data: FakeCostData, changes: CostChanges): CostPreview {
  const suppliesChanged = changes.basePrices.map((bp) => {
    const supply = data.sheet.snapshot.supplies.find(
      (s) => s.id === bp.supplyId,
    );
    const before = supply?.unitCost ?? '39.9000';
    const after = bp.basePrice ? `${bp.basePrice}00` : before;
    return {
      supplyId: bp.supplyId,
      name: supply?.name ?? `Insumo ${bp.supplyId}`,
      before,
      after,
    };
  });

  const productsImpact =
    suppliesChanged.length > 0
      ? [
          {
            before: data.sheet.products[0],
            after: {
              ...data.sheet.products[0],
              cmv: '13.29',
              cmvPercent: '39.3',
              pv: '31.70',
              targetStatus: 'below' as const,
              belowTarget: true,
            },
          },
        ]
      : [];

  return {
    ...data.sheet,
    impact: {
      supplies: suppliesChanged,
      products: productsImpact,
      becameBelowTarget: productsImpact.filter(
        (p) => !p.before.belowTarget && p.after.belowTarget,
      ).length,
    },
  };
}

/**
 * Trata requisições às rotas `/costs/*` simulando o comportamento da API do backend.
 *
 * @example fakeCostRoute(data, 'GET', '/costs', '', {})
 */
export function fakeCostRoute(
  data: FakeCostData,
  method: HttpMethod,
  path: string,
  _query: string,
  body: Record<string, unknown>,
): unknown {
  if (method === 'GET' && path === '/costs') {
    return data.sheet;
  }
  if (method === 'POST' && path === '/costs/preview') {
    return fakePreview(data, (body.changes ?? {}) as CostChanges);
  }
  if (method === 'POST' && path === '/costs/apply') {
    if (data.conflictOnApply) {
      throw new ApiError(
        409,
        'Os custos mudaram em outro aparelho. Recarregue para ver o que está valendo.',
      );
    }
    if (data.errorOnApply) {
      throw new ApiError(422, data.errorOnApply);
    }
    data.lastAppliedChanges = {
      changes: body.changes as CostChanges,
      basedOnChangeSetId: (body.basedOnChangeSetId as number | null) ?? null,
    };
    const result: ApplyCostResult = { changeSetId: data.nextChangeSetId++ };
    return result;
  }
  if (method === 'GET' && path === '/costs/history') {
    return data.historyRows;
  }
  throw new ApiError(404, `Rota não encontrada: ${method} ${path}`);
}
