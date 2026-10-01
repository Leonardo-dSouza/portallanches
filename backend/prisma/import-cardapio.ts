// Uso: tsx prisma/import-cardapio.ts <planilha.xlsm> [--mapping mapeamento.json] [--corrections correcoes.json] [--apply]
// Sem --mapping/--corrections usa a configuração do código (src/spreadsheet-import/config/).
// Sem --apply é só simulação. Ver README, seção "Importar a planilha de custos (cardápio)".
import { readFileSync } from 'node:fs';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { ExcelJsFormulaWorkbookReader } from '../src/menu-import/formula-grid-reader.js';
import { parseMenuMapping } from '../src/menu-import/menu-mapping.js';
import { buildMenuPlan } from '../src/menu-import/menu-plan.js';
import {
  formatChanges,
  formatMenuSummary,
} from '../src/menu-import/menu-report.js';
import type { MenuCorrections } from '../src/menu-import/menu-types.js';
import { PrismaMenuImportTarget } from '../src/menu-import/prisma-menu-import.target.js';
import { runMenuImport } from '../src/menu-import/run-menu-import.js';
import {
  CARDAPIO_CORRECTIONS,
  CARDAPIO_MAPPING,
} from '../src/spreadsheet-import/import-configs.js';
import {
  formatIssue,
  formatOutcome,
} from '../src/ticket-import/import-report.js';

const DEFAULT_DATABASE_URL =
  'postgresql://postgres:postgres@localhost:15433/portallanches';

interface CliArgs {
  file: string;
  mappingPath: string | null;
  correctionsPath: string | null;
  apply: boolean;
}

function flagValue(argv: string[], flag: string): string | null {
  const index = argv.indexOf(flag);
  return index >= 0 ? (argv[index + 1] ?? null) : null;
}

function parseArgs(argv: string[]): CliArgs {
  const file = argv.find((arg) => /\.xls[xm]$/.test(arg));
  if (!file)
    throw new Error(
      `Argumentos inválidos: esperado <planilha.xlsm> (ex.: tsx prisma/import-cardapio.ts ../docs/dataset-portallanches/plan_custo_2026junho.xlsm); recebido ${JSON.stringify(argv)}`,
    );
  return {
    file,
    mappingPath: flagValue(argv, '--mapping'),
    correctionsPath: flagValue(argv, '--corrections'),
    apply: argv.includes('--apply'),
  };
}

const readJson = (path: string): unknown =>
  JSON.parse(readFileSync(path, 'utf8'));

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const grids = await new ExcelJsFormulaWorkbookReader().readSheets(args.file);
  const mapping = parseMenuMapping(
    args.mappingPath ? readJson(args.mappingPath) : CARDAPIO_MAPPING,
  );
  const corrections = (
    args.correctionsPath ? readJson(args.correctionsPath) : CARDAPIO_CORRECTIONS
  ) as MenuCorrections;
  const plan = buildMenuPlan(grids, mapping, corrections);
  const connectionString = process.env.DATABASE_URL ?? DEFAULT_DATABASE_URL;
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });
  try {
    const target = new PrismaMenuImportTarget(prisma);
    const result = await runMenuImport(plan, target, args.apply);
    console.log(result.issues.map(formatIssue).join('\n'));
    console.log(formatChanges(result.changes));
    console.log(formatMenuSummary(plan));
    console.log(formatOutcome(result.outcome));
    process.exitCode = result.outcome === 'blocked' ? 1 : 0;
  } finally {
    await prisma.$disconnect();
  }
}

await main();
