import type { ImportResult } from '../api/import-api';
import { importSummaryText, toImportReport } from './import-report';

const RESULT: ImportResult = {
  outcome: 'dry-run',
  issues: [
    { severity: 'warning', where: 'Plan1!E6', message: 'sem custo' },
    { severity: 'error', where: 'Plan1!7', message: 'repetido' },
  ],
  changes: [
    '+ insumo "Fanta Lt 350ml" (un, sem custo)',
    '~ "Coca" · Refrigerantes: preço 6.00 → 6.50',
    '- "Soda" · Refrigerantes: desativado (sumiu da planilha)',
  ],
  summary: {
    supplies: 2,
    products: [
      { category: 'Refrigerantes', count: 2 },
      { category: 'Cervejas', count: 1 },
    ],
  },
};

describe('toImportReport', () => {
  it('separa erros, desativações, avisos, novidades e alterações', () => {
    expect(toImportReport(RESULT)).toEqual({
      errors: [RESULT.issues[1]],
      deactivations: ['"Soda" · Refrigerantes: desativado (sumiu da planilha)'],
      warnings: [RESULT.issues[0]],
      additions: ['insumo "Fanta Lt 350ml" (un, sem custo)'],
      updates: ['"Coca" · Refrigerantes: preço 6.00 → 6.50'],
    });
  });
});

describe('importSummaryText', () => {
  it('junta insumos e produtos por categoria', () => {
    expect(importSummaryText(RESULT.summary)).toBe(
      '2 insumos · Refrigerantes 2 · Cervejas 1',
    );
  });
});
