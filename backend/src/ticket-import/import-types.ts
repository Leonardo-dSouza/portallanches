/** Valor de célula já normalizado (fórmulas viram o resultado; erros do Excel viram texto). */
export type CellValue = string | number | Date | null;

/** Uma aba como matriz `grid[linha][coluna]`, ambos a partir de 0. */
export type SheetGrid = CellValue[][];

export interface ImportIssue {
  severity: 'error' | 'warning';
  /** Onde: `Aba!Coluna` (ex.: `Janeiro!B`) ou `Aba` quando vale para a aba toda. */
  where: string;
  message: string;
}

/** Um dia da planilha pronto para gravar. Valores em reais com 2 casas (`'36.40'`). */
export interface PlannedDay {
  date: string;
  orderAmounts: string[];
  /** 2ª linha da aba de gastos; null se a célula estava vazia. */
  motoboy: string | null;
  otherExpenses: string[];
}

export interface ImportPlan {
  days: PlannedDay[];
  issues: ImportIssue[];
}

/**
 * Correções manuais da planilha (arquivo JSON escolhido por quem importa):
 * - cabeçalho: `{ "Aba!Coluna": "YYYY-MM-DD" | "skip" }` (`skip` ignora a coluna);
 * - célula: `{ "Aba!ColunaLinha": 127.2 | "skip" }` (`skip` ignora só essa célula).
 */
export type Corrections = Record<string, string | number>;

export const hasErrors = (issues: ImportIssue[]): boolean =>
  issues.some((issue) => issue.severity === 'error');

export type ImportOutcome = 'dry-run' | 'applied' | 'blocked';
