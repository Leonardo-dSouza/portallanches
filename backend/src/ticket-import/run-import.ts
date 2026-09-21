import {
  hasErrors,
  type ImportIssue,
  type ImportOutcome,
  type ImportPlan,
} from './import-types.js';
import type { ImportTarget } from './import-target.js';

export interface ImportResult {
  outcome: ImportOutcome;
  issues: ImportIssue[];
}

async function existingDateIssues(
  plan: ImportPlan,
  target: ImportTarget,
): Promise<ImportIssue[]> {
  const existing = await target.findExistingDates(plan.days.map((d) => d.date));
  return existing.map((date) => ({
    severity: 'error',
    where: date,
    message: `já existe fechamento em ${date} no banco: a importação não sobrescreve dias`,
  }));
}

/**
 * Executa a importação. Qualquer erro (da planilha ou dia já existente) bloqueia tudo;
 * sem `apply` só valida (dry-run).
 *
 * @example await runImport(plan, target, false) // { outcome: 'dry-run', issues: [] }
 */
export async function runImport(
  plan: ImportPlan,
  target: ImportTarget,
  apply: boolean,
): Promise<ImportResult> {
  const issues = [...plan.issues, ...(await existingDateIssues(plan, target))];
  if (hasErrors(issues)) return { outcome: 'blocked', issues };
  if (!apply) return { outcome: 'dry-run', issues };
  await target.writeDays(plan.days);
  return { outcome: 'applied', issues };
}
