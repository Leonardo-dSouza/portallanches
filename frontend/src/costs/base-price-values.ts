import type {
  BasePriceChange,
  CostPreview,
  CostSheetView,
  CostSupply,
} from '../api/cost-types';
import type { CostDraft } from './use-cost-draft';
import { toApiMoney } from '../api/money';
import { formatQuantity } from '../api/quantity';
import type { SupplySection } from '../api/types';

/** Embalagem escolhida para o preço base; label nulo representa compra por unidade. */
export interface BasePriceChoice {
  label: string | null;
  quantity: string;
}

/** Grupo de insumos reunidos pela seção do estoque. */
export interface SupplyGroup {
  id: number | null;
  name: string;
  supplies: CostSupply[];
}

function emptyPriceChange(supplyId: number, choice: BasePriceChoice) {
  return {
    ok: true as const,
    change: {
      supplyId,
      basePrice: null,
      baseQuantity: choice.quantity,
      baseLabel: choice.label,
    },
  };
}

function parseValidPriceChange(
  supplyId: number,
  basePrice: string,
  choice: BasePriceChoice,
) {
  return {
    ok: true as const,
    change: {
      supplyId,
      basePrice,
      baseQuantity: choice.quantity,
      baseLabel: choice.label,
    },
  };
}

/**
 * Converte o preço digitado e a embalagem selecionada em uma alteração de preço base.
 * Vazio limpa o preço base; valores inválidos retornam problema formatado.
 *
 * @example toBasePriceChange(1, '44,80', { label: 'caixa', quantity: '36' })
 */
export function toBasePriceChange(
  supplyId: number,
  typed: string,
  choice: BasePriceChoice,
): { ok: true; change: BasePriceChange } | { ok: false; problem: string } {
  const trimmed = typed.trim();
  if (trimmed === '') return emptyPriceChange(supplyId, choice);
  const parsed = toApiMoney(trimmed);
  if (parsed === null) {
    return {
      ok: false,
      problem: `Preço base "${typed}" inválido: esperado valor numérico (ex.: 12,50)`,
    };
  }
  return parseValidPriceChange(supplyId, parsed, choice);
}

/**
 * Lista as opções de compra do insumo: suas embalagens cadastradas mais a opção por unidade.
 *
 * @example const choices = packageChoices(supply);
 */
export function packageChoices(supply: {
  packages: { name: string; quantity: string }[];
}): BasePriceChoice[] {
  const packages: BasePriceChoice[] = supply.packages.map((pkg) => ({
    label: pkg.name,
    quantity: pkg.quantity,
  }));
  const hasUnit = packages.some((p) => p.label === null && p.quantity === '1');
  if (hasUnit) return packages;
  return [...packages, { label: null, quantity: '1' }];
}

/**
 * Devolve a embalagem atualmente registrada no insumo, ou unidade se não houver base salva.
 *
 * @example const choice = currentChoice(supply);
 */
export function currentChoice(supply: CostSupply): BasePriceChoice {
  if (supply.baseQuantity) {
    return {
      label: supply.baseLabel,
      quantity: supply.baseQuantity,
    };
  }
  return { label: null, quantity: '1' };
}

/**
 * Formata o rótulo de uma opção de embalagem no select de compra.
 *
 * @example formatChoiceLabel({ label: 'caixa', quantity: '36' }, 'un') // 'caixa de 36 un'
 */
export function formatChoiceLabel(
  choice: BasePriceChoice,
  countUnit: string,
): string {
  if (choice.label === null) {
    return `unidade (${countUnit})`;
  }
  if (choice.label === countUnit) {
    return countUnit;
  }
  if (choice.label.toLowerCase().includes(' de ')) {
    return choice.label;
  }
  return `${choice.label} de ${formatQuantity(choice.quantity)} ${countUnit}`;
}

/**
 * Formata o custo por unidade em 4 casas decimais com vírgula e a unidade de contagem.
 *
 * @example formatUnitCost('1.2444', 'un') // '1,2444 /un'
 */
export function formatUnitCost(
  unitCost: string | null,
  countUnit: string,
): string {
  if (!unitCost) return 'sem custo';
  const [intPart, decPart = ''] = unitCost.split('.');
  const dec4 = decPart.padEnd(4, '0').slice(0, 4);
  return `${intPart},${dec4} /${countUnit}`;
}

/**
 * Formata a quantidade de lanches e fichas técnicas que utilizam o insumo.
 *
 * @example formatUsedIn(22, 1) // '22 lanches · 1 ficha'
 */
export function formatUsedIn(lanches: number, fichas: number): string {
  const parts: string[] = [];
  if (lanches > 0) {
    parts.push(`${lanches} ${lanches === 1 ? 'lanche' : 'lanches'}`);
  }
  if (fichas > 0) {
    parts.push(`${fichas} ${fichas === 1 ? 'ficha' : 'fichas'}`);
  }
  if (parts.length === 0) return '—';
  return parts.join(' · ');
}

function hasDraftCostChange(
  supplyId: number,
  changes: CostDraft['changes'],
): boolean {
  const hasBase = changes.basePrices.some((b) => b.supplyId === supplyId);
  const hasRecipe = changes.recipes.some((r) => r.supplyId === supplyId);
  const wasRemoved = changes.removedRecipeSupplyIds.includes(supplyId);
  return hasBase || hasRecipe || wasRemoved;
}

/**
 * Indica se o insumo sofreu alterações no rascunho atual ou impacto no custo previsto.
 *
 * @example isSupplyChanged(1, draft, view)
 */
export function isSupplyChanged(
  supplyId: number,
  draft: CostDraft,
  view: CostSheetView,
): boolean {
  if (hasDraftCostChange(supplyId, draft.changes)) return true;
  const preview =
    draft.preview ?? ('impact' in view ? (view as CostPreview) : null);
  return Boolean(
    preview?.impact.supplies.some(
      (s) => s.supplyId === supplyId && s.before !== s.after,
    ),
  );
}

/**
 * Indica se o insumo é produzido artesanalmente via ficha de produção.
 *
 * @example isProducedSupply(2, view, draft)
 */
export function isProducedSupply(
  supplyId: number,
  view: CostSheetView,
  draft: CostDraft,
): boolean {
  const inSnapshot = view.snapshot.recipes.some((r) => r.supplyId === supplyId);
  const inDraft = draft.changes.recipes.some((r) => r.supplyId === supplyId);
  const removed = draft.changes.removedRecipeSupplyIds.includes(supplyId);
  return (inSnapshot || inDraft) && !removed;
}

/**
 * Conta em quantos lanches do cardápio e fichas de produção o insumo é utilizado.
 *
 * @example countSupplyUsage(1, view)
 */
export function countSupplyUsage(
  supplyId: number,
  view: CostSheetView,
): { lanches: number; fichas: number } {
  const lanches = view.snapshot.products.filter((p) =>
    p.components.some((c) => c.supplyId === supplyId),
  ).length;
  const fichas = view.snapshot.recipes.filter((r) =>
    r.items.some((i) => i.supplyId === supplyId),
  ).length;
  return { lanches, fichas };
}

function findUnassignedSupplies(
  supplies: CostSupply[],
  sections: SupplySection[],
): CostSupply[] {
  const knownIds = new Set(sections.map((sec) => sec.id));
  return supplies.filter(
    (s) => s.sectionId === null || !knownIds.has(s.sectionId),
  );
}

/**
 * Agrupa os insumos por seção do estoque conforme a ordenação das prateleiras.
 *
 * @example groupSuppliesBySection(supplies, sections)
 */
export function groupSuppliesBySection(
  supplies: CostSupply[],
  sections: SupplySection[],
): SupplyGroup[] {
  const sorted = [...sections].sort((a, b) => a.sortOrder - b.sortOrder);
  const groups: SupplyGroup[] = sorted.map((sec) => ({
    id: sec.id,
    name: sec.name,
    supplies: supplies.filter((s) => s.sectionId === sec.id),
  }));
  const unassigned = findUnassignedSupplies(supplies, sections);
  if (unassigned.length > 0) {
    groups.push({ id: null, name: 'Sem seção', supplies: unassigned });
  }
  return groups.filter((g) => g.supplies.length > 0);
}
