import type { ImportIssue, ImportResult } from '../api/import-api';

/** O resultado da importação separado no que a tela mostra, do mais grave ao mais comum. */
export interface ImportReportView {
  errors: ImportIssue[];
  /** Itens que a gravação vai desativar (sumiram da planilha). */
  deactivations: string[];
  warnings: ImportIssue[];
  additions: string[];
  updates: string[];
}

const linesWith = (changes: string[], prefix: '+' | '~' | '-') =>
  changes
    .filter((line) => line.startsWith(`${prefix} `))
    .map((line) => line.slice(2));

/**
 * Separa erros, desativações, avisos, novidades e alterações.
 *
 * @example toImportReport(result).deactivations // ['"X Antigo" · Tradicional: desativado (...)']
 */
export function toImportReport(result: ImportResult): ImportReportView {
  return {
    errors: result.issues.filter((i) => i.severity === 'error'),
    deactivations: linesWith(result.changes, '-'),
    warnings: result.issues.filter((i) => i.severity === 'warning'),
    additions: linesWith(result.changes, '+'),
    updates: linesWith(result.changes, '~'),
  };
}

/**
 * Resumo de uma linha do que a planilha tem.
 *
 * @example importSummaryText(result.summary) // '37 insumos · Refrigerantes 21 · Cervejas 5'
 */
export function importSummaryText(summary: ImportResult['summary']): string {
  const products = summary.products.map((p) => `${p.category} ${p.count}`);
  return [`${summary.supplies} insumos`, ...products].join(' · ');
}
