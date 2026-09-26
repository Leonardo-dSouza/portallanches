import {
  hasErrors,
  type ImportIssue,
  type ImportOutcome,
} from '../ticket-import/import-types.js';
import { diffMenu } from './menu-diff.js';
import type { MenuImportTarget } from './menu-import-target.js';
import type { MenuPlan } from './menu-types.js';

export interface MenuImportResult {
  outcome: ImportOutcome;
  issues: ImportIssue[];
  changes: string[];
}

/**
 * Executa a importação do cardápio. Qualquer erro (planilha, mapeamento ou conflito com o
 * banco) bloqueia tudo; sem `apply` só mostra o que mudaria (simulação).
 *
 * @example await runMenuImport(plan, target, false) // { outcome: 'dry-run', issues: [], changes: [...] }
 */
export async function runMenuImport(
  plan: MenuPlan,
  target: MenuImportTarget,
  apply: boolean,
): Promise<MenuImportResult> {
  const diff = diffMenu(plan, await target.loadSnapshot());
  const issues = [...plan.issues, ...diff.issues];
  if (hasErrors(issues))
    return { outcome: 'blocked', issues, changes: diff.changes };
  if (!apply) return { outcome: 'dry-run', issues, changes: diff.changes };
  await target.write(plan);
  return { outcome: 'applied', issues, changes: diff.changes };
}
