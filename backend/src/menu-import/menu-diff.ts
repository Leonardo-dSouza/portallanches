import type { ImportIssue } from '../ticket-import/import-types.js';
import type {
  ExistingProduct,
  ExistingSupply,
  MenuSnapshot,
} from './menu-import-target.js';
import type {
  MenuPlan,
  PlannedComponent,
  PlannedProduct,
  PlannedSupply,
} from './menu-types.js';

export interface MenuDiff {
  issues: ImportIssue[];
  /** Uma linha por mudança que a importação vai gravar (`+` novo, `~` alterado). */
  changes: string[];
}

type SupplyNames = Map<string, { name: string; countUnit: string }>;

const productLabel = (p: { name: string; category?: string }) =>
  p.category ? `"${p.name}" · ${p.category}` : `"${p.name}"`;

function diffSupply(
  planned: PlannedSupply,
  existing: ExistingSupply | undefined,
): MenuDiff {
  if (!existing)
    return {
      issues: [],
      changes: [
        `+ insumo "${planned.name}" (${planned.countUnit}, custo ${planned.unitCost})`,
      ],
    };
  if (existing.countUnit !== planned.countUnit)
    return {
      issues: [
        {
          severity: 'error',
          where: `insumo "${existing.name}"`,
          message: `unidade no banco é "${existing.countUnit}" e no mapeamento "${planned.countUnit}": a importação não converte unidades`,
        },
      ],
      changes: [],
    };
  if (existing.unitCost === planned.unitCost)
    return { issues: [], changes: [] };
  return {
    issues: [],
    changes: [
      `~ custo de "${planned.name}": ${existing.unitCost ?? 'sem custo'} → ${planned.unitCost}`,
    ],
  };
}

function describeComponent(
  component: PlannedComponent,
  names: SupplyNames,
): string {
  const supply = names.get(component.supplyKey);
  return `${supply?.name ?? component.supplyKey} ${component.quantity} ${supply?.countUnit ?? ''}`.trim();
}

function componentChanges(
  before: PlannedComponent[],
  after: PlannedComponent[],
  names: SupplyNames,
): string[] {
  const old = new Map(before.map((c) => [c.supplyKey, c.quantity]));
  const next = new Map(after.map((c) => [c.supplyKey, c.quantity]));
  const entering = after.filter((c) => old.get(c.supplyKey) !== c.quantity);
  const leaving = before.filter((c) => !next.has(c.supplyKey));
  return [
    ...entering.map((c) => `+${describeComponent(c, names)}`),
    ...leaving.map((c) => `-${describeComponent(c, names)}`),
  ];
}

function productChanges(
  planned: PlannedProduct,
  existing: ExistingProduct,
  names: SupplyNames,
): string[] {
  const label = productLabel(planned);
  const changes: string[] = [];
  if (existing.salePrice !== planned.salePrice)
    changes.push(
      `~ ${label}: preço ${existing.salePrice ?? 'sem preço'} → ${planned.salePrice}`,
    );
  if (existing.description !== planned.description)
    changes.push(`~ ${label}: descrição atualizada`);
  const composition = componentChanges(
    existing.components,
    planned.components,
    names,
  );
  if (composition.length > 0)
    changes.push(`~ ${label}: composição ${composition.join(', ')}`);
  return changes;
}

function diffProduct(
  planned: PlannedProduct,
  snapshot: MenuSnapshot,
  names: SupplyNames,
): MenuDiff {
  if (!snapshot.categoryKeys.includes(planned.categoryKey))
    return {
      issues: [
        {
          severity: 'error',
          where: planned.where,
          message: `categoria "${planned.category}" não existe no banco (esperado Tradicional, Artesanal ou Adicionais)`,
        },
      ],
      changes: [],
    };
  const existing = snapshot.products.find(
    (p) =>
      p.categoryKey === planned.categoryKey && p.nameKey === planned.nameKey,
  );
  if (!existing)
    return {
      issues: [],
      changes: [
        `+ lanche ${productLabel(planned)}: preço ${planned.salePrice}, CMV ${planned.cmv}`,
      ],
    };
  return { issues: [], changes: productChanges(planned, existing, names) };
}

function missingFromSheet(
  plan: MenuPlan,
  snapshot: MenuSnapshot,
): ImportIssue[] {
  const planned = new Set(
    plan.products.map((p) => `${p.categoryKey}|${p.nameKey}`),
  );
  const categories = new Set(plan.products.map((p) => p.categoryKey));
  return snapshot.products
    .filter(
      (p) =>
        categories.has(p.categoryKey) &&
        !planned.has(`${p.categoryKey}|${p.nameKey}`),
    )
    .map((p) => ({
      severity: 'warning',
      where: `lanche "${p.name}"`,
      message:
        'está no banco mas não na planilha: fica como está (nada é apagado)',
    }));
}

function supplyNames(plan: MenuPlan, snapshot: MenuSnapshot): SupplyNames {
  const names: SupplyNames = new Map();
  for (const s of [...snapshot.supplies, ...plan.supplies])
    names.set(s.nameKey, s);
  return names;
}

/**
 * Compara o plano com o banco: mudanças a gravar e conflitos (unidade diferente,
 * categoria ausente). A planilha vence em custo, preço, descrição e composição.
 *
 * @example diffMenu(plan, await target.loadSnapshot()).changes // ['~ custo de "Ovo": 0.7 → 0.7333']
 */
export function diffMenu(plan: MenuPlan, snapshot: MenuSnapshot): MenuDiff {
  const bySupplyKey = new Map(snapshot.supplies.map((s) => [s.nameKey, s]));
  const names = supplyNames(plan, snapshot);
  const parts = [
    ...plan.supplies.map((s) => diffSupply(s, bySupplyKey.get(s.nameKey))),
    ...plan.products.map((p) => diffProduct(p, snapshot, names)),
  ];
  return {
    issues: [
      ...parts.flatMap((p) => p.issues),
      ...missingFromSheet(plan, snapshot),
    ],
    changes: parts.flatMap((p) => p.changes),
  };
}
