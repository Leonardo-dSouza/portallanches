import {
  Inject,
  Injectable,
  UnprocessableEntityException,
} from '@nestjs/common';
import { BEVERAGE_LAYOUT } from '../beverage-import/beverage-layout.js';
import { buildBeveragePlan } from '../beverage-import/beverage-plan.js';
import type { FormulaWorkbookReader } from '../menu-import/formula-grid-reader.js';
import type { MenuImportTarget } from '../menu-import/menu-import-target.js';
import { parseMenuMapping } from '../menu-import/menu-mapping.js';
import { buildMenuPlan } from '../menu-import/menu-plan.js';
import type {
  FormulaGrid,
  ImportSource,
  MenuPlan,
} from '../menu-import/menu-types.js';
import {
  runMenuImport,
  type MenuImportResult,
} from '../menu-import/run-menu-import.js';
import {
  BEVERAGE_CORRECTIONS,
  CARDAPIO_CORRECTIONS,
  CARDAPIO_MAPPING,
} from './import-configs.js';
import type { ImportRequest } from './import-request.js';

export const WORKBOOK_READER = Symbol('WORKBOOK_READER');
export const MENU_IMPORT_TARGET = Symbol('MENU_IMPORT_TARGET');

type Grids = Map<string, FormulaGrid>;

const PLAN_BUILDERS: Record<ImportSource, (grids: Grids) => MenuPlan> = {
  cardapio: (grids) =>
    buildMenuPlan(
      grids,
      parseMenuMapping(CARDAPIO_MAPPING),
      CARDAPIO_CORRECTIONS,
    ),
  bebidas: (grids) =>
    buildBeveragePlan(grids, BEVERAGE_LAYOUT, BEVERAGE_CORRECTIONS),
};

/** Quantos insumos e produtos por categoria a planilha tem (mostrado junto da simulação). */
export interface ImportSummary {
  supplies: number;
  products: { category: string; count: number }[];
}

export interface SpreadsheetImportResult extends MenuImportResult {
  summary: ImportSummary;
}

function summarize(plan: MenuPlan): ImportSummary {
  const counts = new Map<string, number>();
  for (const p of plan.products)
    counts.set(p.category, (counts.get(p.category) ?? 0) + 1);
  return {
    supplies: plan.supplies.length,
    products: [...counts].map(([category, count]) => ({ category, count })),
  };
}

/**
 * Importa uma planilha enviada pela tela do admin: monta o plano conforme o tipo, compara
 * com o banco e só grava com `apply` e sem erros (tudo ou nada).
 *
 * @example await service.run({ kind: 'bebidas', file, apply: false }) // simulação
 */
@Injectable()
export class SpreadsheetImportService {
  constructor(
    @Inject(WORKBOOK_READER) private readonly reader: FormulaWorkbookReader,
    @Inject(MENU_IMPORT_TARGET) private readonly target: MenuImportTarget,
  ) {}

  async run(request: ImportRequest): Promise<SpreadsheetImportResult> {
    const grids = await this.readGrids(request.file);
    const plan = PLAN_BUILDERS[request.kind](grids);
    const result = await runMenuImport(plan, this.target, request.apply);
    return { ...result, summary: summarize(plan) };
  }

  private async readGrids(file: Buffer): Promise<Grids> {
    try {
      return await this.reader.readSheetsFromBuffer(file);
    } catch (error) {
      const cause = error instanceof Error ? error.message : String(error);
      throw new UnprocessableEntityException(
        `Não deu para abrir o arquivo (${file.length} bytes) como planilha .xlsx/.xlsm: ${cause}`,
      );
    }
  }
}
