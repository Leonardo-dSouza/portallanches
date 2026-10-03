import { toNeighborhoodKey } from '../../delivery/neighborhood-key.js';
import type { SupplySeedSection } from './supply-seed-list.js';

/** Insumo que já está no banco (ativo ou não), como o seed precisa vê-lo. */
export interface SeedExistingSupply {
  id: number;
  name: string;
  nameKey: string;
  sectionId: number | null;
}

export interface SeedSectionRef {
  id: number;
  nameKey: string;
}

export interface SupplySeedPlan {
  /** Insumos novos, já com a chave do nome e a seção. */
  create: { name: string; nameKey: string; sectionId: number }[];
  /** Existentes sem seção: só ganham a seção da anotação. */
  fillSection: { id: number; sectionId: number }[];
  /** De-para do que já existia (nome da anotação → nome no banco), para conferência. */
  matched: { name: string; existing: string }[];
}

interface SeedState {
  plan: SupplySeedPlan;
  byKey: Map<string, SeedExistingSupply>;
  /** Ids já tratados: dois nomes da anotação podem cair no mesmo insumo (pão de hambúrguer e de hot). */
  touched: Set<number>;
}

function findExisting(
  name: string,
  aliases: readonly string[],
  byKey: Map<string, SeedExistingSupply>,
): SeedExistingSupply | undefined {
  const keys = [name, ...aliases].map(toNeighborhoodKey);
  return keys.map((key) => byKey.get(key)).find((found) => found);
}

function sectionIdOf(name: string, sections: SeedSectionRef[]): number {
  const found = sections.find((s) => s.nameKey === toNeighborhoodKey(name));
  if (found) return found.id;
  throw new Error(
    `Seção "${name}" não existe no banco: esperada uma das criadas pela migration supply_sections`,
  );
}

function planEntry(
  state: SeedState,
  entry: { name: string; aliases?: readonly string[] },
  sectionId: number,
): void {
  const existing = findExisting(entry.name, entry.aliases ?? [], state.byKey);
  if (!existing) {
    const nameKey = toNeighborhoodKey(entry.name);
    state.plan.create.push({ name: entry.name, nameKey, sectionId });
    state.byKey.set(nameKey, { id: -1, name: entry.name, nameKey, sectionId });
    return;
  }
  state.plan.matched.push({ name: entry.name, existing: existing.name });
  if (existing.sectionId !== null || state.touched.has(existing.id)) return;
  state.touched.add(existing.id);
  state.plan.fillSection.push({ id: existing.id, sectionId });
}

/**
 * Decide o que o seed faz com cada item da anotação: o que já existe (pelo nome ou por um
 * alias, sem acento e sem maiúsculas) é ignorado e só ganha a seção se não tiver; o resto
 * é criado. Rodar de novo sobre o resultado não planeja nada.
 *
 * @example planSupplySeed(SUPPLY_SEED, existing, sections).create.length
 */
export function planSupplySeed(
  seed: readonly SupplySeedSection[],
  existing: SeedExistingSupply[],
  sections: SeedSectionRef[],
): SupplySeedPlan {
  const state: SeedState = {
    plan: { create: [], fillSection: [], matched: [] },
    byKey: new Map(existing.map((s) => [s.nameKey, s])),
    touched: new Set(),
  };
  for (const group of seed) {
    const sectionId = sectionIdOf(group.section, sections);
    for (const entry of group.supplies) planEntry(state, entry, sectionId);
  }
  return state.plan;
}
