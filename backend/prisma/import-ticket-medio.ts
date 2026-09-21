// Uso: tsx prisma/import-ticket-medio.ts <planilha.xlsx> [--corrections arquivo.json] [--apply]
// Sem --apply é só simulação (dry-run). Ver README, seção "Importar a planilha histórica".
import { readFileSync } from 'node:fs';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { buildImportPlan } from '../src/ticket-import/import-plan.js';
import {
  formatIssue,
  formatOutcome,
  formatSummary,
} from '../src/ticket-import/import-report.js';
import { summarizeByMonth } from '../src/ticket-import/import-summary.js';
import { PrismaImportTarget } from '../src/ticket-import/prisma-import.target.js';
import { runImport } from '../src/ticket-import/run-import.js';
import type { Corrections } from '../src/ticket-import/import-types.js';
import { ExcelJsWorkbookReader } from '../src/ticket-import/xlsx-grid-reader.js';

const DEFAULT_DATABASE_URL =
  'postgresql://postgres:postgres@localhost:5432/portallanches';
const IMPORT_YEAR = 2026;

interface CliArgs {
  file: string;
  correctionsPath: string | null;
  apply: boolean;
}

function parseArgs(argv: string[]): CliArgs {
  const file = argv.find((arg) => arg.endsWith('.xlsx'));
  if (!file) {
    throw new Error(
      `Planilha ausente: esperado um caminho .xlsx (ex.: tsx prisma/import-ticket-medio.ts ../docs/dataset-portallanches/ticket-medio-2026.xlsx); recebido ${JSON.stringify(argv)}`,
    );
  }
  const flag = argv.indexOf('--corrections');
  return {
    file,
    correctionsPath: flag >= 0 ? (argv[flag + 1] ?? null) : null,
    apply: argv.includes('--apply'),
  };
}

function loadCorrections(path: string | null): Corrections {
  if (!path) return {};
  return JSON.parse(readFileSync(path, 'utf8')) as Corrections;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const grids = await new ExcelJsWorkbookReader().readSheets(args.file);
  const plan = buildImportPlan(
    grids,
    IMPORT_YEAR,
    loadCorrections(args.correctionsPath),
  );
  const connectionString = process.env.DATABASE_URL ?? DEFAULT_DATABASE_URL;
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });
  try {
    const result = await runImport(
      plan,
      new PrismaImportTarget(prisma),
      args.apply,
    );
    console.log(result.issues.map(formatIssue).join('\n'));
    console.log(formatSummary(summarizeByMonth(plan.days)));
    console.log(formatOutcome(result.outcome));
    process.exitCode = result.outcome === 'blocked' ? 1 : 0;
  } finally {
    await prisma.$disconnect();
  }
}

await main();
