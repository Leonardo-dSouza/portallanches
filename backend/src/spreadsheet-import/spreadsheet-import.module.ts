import { Module } from '@nestjs/common';
import type { PrismaClient } from '../generated/prisma/client.js';
import { ExcelJsFormulaWorkbookReader } from '../menu-import/formula-grid-reader.js';
import { PrismaMenuImportTarget } from '../menu-import/prisma-menu-import.target.js';
import { DATABASE_CLIENT } from '../prisma/prisma.service.js';
import { SpreadsheetImportController } from './spreadsheet-import.controller.js';
import {
  MENU_IMPORT_TARGET,
  SpreadsheetImportService,
  WORKBOOK_READER,
} from './spreadsheet-import.service.js';

@Module({
  controllers: [SpreadsheetImportController],
  providers: [
    SpreadsheetImportService,
    { provide: WORKBOOK_READER, useClass: ExcelJsFormulaWorkbookReader },
    {
      provide: MENU_IMPORT_TARGET,
      useFactory: (prisma: PrismaClient) => new PrismaMenuImportTarget(prisma),
      inject: [DATABASE_CLIENT],
    },
  ],
})
export class SpreadsheetImportModule {}
