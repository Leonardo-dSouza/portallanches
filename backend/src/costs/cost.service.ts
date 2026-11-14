import {
  BadRequestException,
  Inject,
  Injectable,
  UnprocessableEntityException,
} from '@nestjs/common';
import type { SessionUser } from '../auth/session-user.js';
import { toBusinessDate } from '../closing/business-date.js';
import { BUSINESS_TIMEZONE, CLOCK, type Clock } from '../common/clock.js';
import { parseObject } from '../common/input-parsers.js';
import { parseCostChanges } from './cost-input.js';
import { applyCostChanges } from './cost-plan.js';
import {
  COST_REPOSITORY,
  type CostHistoryRow,
  type CostRepository,
} from './cost-repository.js';
import { summarizeCostChanges } from './cost-summary.js';
import type {
  CostChanges,
  CostImpact,
  CostPreviewView,
  CostSheetView,
  CostSnapshot,
} from './cost-types.js';
import {
  costImpact,
  isSupplyCostComplete,
  productCostViews,
} from './cost-view.js';

/** Valida o id do último lote base enviado no rascunho. */
function parseBasedOnChangeSetId(raw: unknown): number | null {
  if (raw === null) return null;
  if (typeof raw === 'number' && Number.isInteger(raw) && raw > 0) {
    return raw;
  }
  throw new BadRequestException(
    `Campo "basedOnChangeSetId" inválido: recebido ${JSON.stringify(raw)}, esperado inteiro positivo ou null`,
  );
}

/** Valida o parâmetro de consulta supplyId da rota de histórico. */
export function parseSupplyIdQuery(raw: unknown): number {
  if (typeof raw !== 'string' && typeof raw !== 'number') {
    throw new BadRequestException(
      `Id de insumo inválido: recebido ${JSON.stringify(raw)}, esperado inteiro positivo`,
    );
  }
  const text = String(raw);
  if (!/^[1-9]\d*$/.test(text)) {
    throw new BadRequestException(
      `Id de insumo inválido: recebido ${JSON.stringify(raw)}, esperado inteiro positivo`,
    );
  }
  return Number(text);
}

/** Garante que há pelo menos uma alteração efetiva de custo, preço ou composição. */
function assertHasEffectiveChanges(
  changes: CostChanges,
  impact: CostImpact,
): void {
  const hasImpact = impact.supplies.length > 0 || impact.products.length > 0;
  const hasChanges =
    changes.basePrices.length > 0 ||
    changes.recipes.length > 0 ||
    changes.removedRecipeSupplyIds.length > 0 ||
    changes.components.length > 0 ||
    changes.salePrices.length > 0;
  if (!hasImpact && !hasChanges) {
    throw new UnprocessableEntityException(
      'Rascunho sem nenhuma alteração efetiva: esperado pelo menos uma mudança de custo, preço ou ficha',
    );
  }
}

/** Monta a visão da planilha de custos a partir de uma fotografia do sistema. */
function buildCostSheet(snapshot: CostSnapshot): CostSheetView {
  const products = productCostViews(snapshot);
  const incompleteSupplyIds = snapshot.supplies
    .filter((s) => !isSupplyCostComplete(s.id, snapshot))
    .map((s) => s.id);
  return { snapshot, products, incompleteSupplyIds };
}

/**
 * Serviço da área de Custos: planilha completa, projeção antes/depois, salvamento e histórico.
 */
@Injectable()
export class CostService {
  constructor(
    @Inject(COST_REPOSITORY) private readonly repo: CostRepository,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(BUSINESS_TIMEZONE) private readonly timeZone: string,
  ) {}

  /**
   * Devolve a planilha de custos atual com snapshot, produtos calculados e insumos incompletos.
   *
   * @example await service.sheet()
   */
  async sheet(): Promise<CostSheetView> {
    const snapshot = await this.repo.loadSnapshot();
    return buildCostSheet(snapshot);
  }

  /**
   * Simula o impacto de alterações de custos nos produtos sem persistir nada.
   *
   * @example await service.preview({ changes: { ... } })
   */
  async preview(body: unknown): Promise<CostPreviewView> {
    const record = parseObject(body, 'preview de custos');
    const changes = parseCostChanges(record.changes);
    const before = await this.repo.loadSnapshot();
    const after = applyCostChanges(before, changes);
    const sheet = buildCostSheet(after);
    const impact = costImpact(before, after);
    return { ...sheet, impact };
  }

  /**
   * Persiste um lote de alterações de custos, fichas e preços de venda com histórico.
   *
   * @example await service.apply(user, { changes: { ... }, basedOnChangeSetId: 7 })
   */
  async apply(
    user: SessionUser,
    body: unknown,
  ): Promise<{ changeSetId: number }> {
    const record = parseObject(body, 'aplicação de custos');
    const basedOnChangeSetId = parseBasedOnChangeSetId(
      record.basedOnChangeSetId,
    );
    const changes = parseCostChanges(record.changes);
    const before = await this.repo.loadSnapshot();
    const after = applyCostChanges(before, changes);
    const impact = costImpact(before, after);
    assertHasEffectiveChanges(changes, impact);

    const summary = summarizeCostChanges(before, changes);
    const today = toBusinessDate(this.clock(), this.timeZone);
    const changeSetId = await this.repo.apply({
      after,
      changes,
      supplyChanges: impact.supplies,
      summary,
      basedOnChangeSetId,
      userId: user.id,
      today,
    });
    return { changeSetId };
  }

  /**
   * Consulta o histórico de alterações de custo e preço base de um insumo específico.
   *
   * @example await service.history('1')
   */
  async history(rawSupplyId: unknown): Promise<CostHistoryRow[]> {
    const supplyId = parseSupplyIdQuery(rawSupplyId);
    return this.repo.history(supplyId);
  }
}
