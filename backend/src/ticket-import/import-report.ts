import type { ImportIssue, ImportOutcome } from './import-types.js';
import type { MonthSummary } from './import-summary.js';

export const formatIssue = (issue: ImportIssue): string =>
  `[${issue.severity === 'error' ? 'ERRO' : 'aviso'}] ${issue.where}: ${issue.message}`;

export function formatSummary(months: MonthSummary[]): string {
  const lines = months.map(
    (m) =>
      `${m.month}: ${m.days} dias, ${m.orders} pedidos (R$ ${m.ordersTotal}), motoboy R$ ${m.motoboyTotal}, outros gastos R$ ${m.otherExpensesTotal}`,
  );
  return lines.join('\n');
}

const OUTCOME_TEXT: Record<ImportOutcome, string> = {
  'dry-run': 'Simulação concluída: nada foi gravado. Use --apply para gravar.',
  applied: 'Importação gravada com sucesso.',
  blocked: 'Importação BLOQUEADA: nada foi gravado. Corrija os erros acima.',
};

export const formatOutcome = (outcome: ImportOutcome): string =>
  OUTCOME_TEXT[outcome];
