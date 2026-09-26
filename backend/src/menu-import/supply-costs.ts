import { normalizeDecimal } from '../common/quantity.js';
import { toNeighborhoodKey } from '../delivery/neighborhood-key.js';
import type { CellValue, ImportIssue } from '../ticket-import/import-types.js';
import { formulaCellAt, parseCellAddress } from './cell-address.js';
import type { FormulaGrid, MappedSupply, PlannedSupply } from './menu-types.js';

export const COSTS_SHEET = 'itens_custos';

/** Número de uma célula; aceita texto numérico ("3.02" digitado como texto na planilha). */
export function numericCell(value: CellValue): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value !== 'string' || !/^\d+(\.\d+)?$/.test(value.trim()))
    return null;
  return Number(value.trim());
}

/**
 * Custo por unidade de contagem com 4 casas (mesmo limite do cadastro de insumos).
 *
 * @example toUnitCost(37.5, '36') // '1.0417'
 */
export function toUnitCost(price: number, per: string): string | null {
  const cost = Math.round((price / Number(per)) * 10_000) / 10_000;
  return cost >= 0 ? normalizeDecimal(cost.toFixed(4), 4) : null;
}

function planSupply(
  costs: FormulaGrid,
  supply: MappedSupply,
): PlannedSupply | ImportIssue {
  const { row, column } = parseCellAddress(supply.costCell)!;
  const raw = formulaCellAt(costs, row, column).value;
  const price = numericCell(raw);
  const unitCost = price === null ? null : toUnitCost(price, supply.costPer);
  if (unitCost === null)
    return {
      severity: 'error',
      where: `${COSTS_SHEET}!${supply.costCell}`,
      message: `preço de "${supply.name}" inválido: recebido ${JSON.stringify(raw)}, esperado número não negativo`,
    };
  const { costCell: _cell, costPer: _per, ...fields } = supply;
  return { ...fields, nameKey: toNeighborhoodKey(supply.name), unitCost };
}

const isIssue = (item: PlannedSupply | ImportIssue): item is ImportIssue =>
  'severity' in item;

function duplicateIssues(supplies: PlannedSupply[]): ImportIssue[] {
  const keys = supplies.map((s) => s.nameKey);
  return supplies
    .filter((s, i) => keys.indexOf(s.nameKey) !== i)
    .map((s) => ({
      severity: 'error',
      where: 'mapeamento',
      message: `insumo "${s.name}" aparece mais de uma vez em supplies`,
    }));
}

/**
 * Insumos do mapeamento com o custo lido de `itens_custos` (preço ÷ `costPer`).
 *
 * @example planSupplies(grids.get('itens_custos'), mapping.supplies)
 */
export function planSupplies(
  costs: FormulaGrid,
  mapped: MappedSupply[],
): { supplies: PlannedSupply[]; issues: ImportIssue[] } {
  const results = mapped.map((supply) => planSupply(costs, supply));
  const supplies = results.filter((r): r is PlannedSupply => !isIssue(r));
  const issues = results.filter(isIssue);
  return { supplies, issues: [...issues, ...duplicateIssues(supplies)] };
}
