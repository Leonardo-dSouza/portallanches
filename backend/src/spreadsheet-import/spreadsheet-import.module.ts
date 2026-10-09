import { Module } from '@nestjs/common';
import { toBusinessDate } from '../closing/business-date.js';
import { BUSINESS_TIMEZONE, CLOCK, type Clock } from '../common/clock.js';
import { BUSINESS_CLOCK_PROVIDERS } from '../common/clock-providers.js';
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
    ...BUSINESS_CLOCK_PROVIDERS,
    {
      provide: MENU_IMPORT_TARGET,
      useFactory: (prisma: PrismaClient, clock: Clock, timeZone: string) =>
        new PrismaMenuImportTarget(prisma, () =>
          toBusinessDate(clock(), timeZone),
        ),
      inject: [DATABASE_CLIENT, CLOCK, BUSINESS_TIMEZONE],
    },
  ],
})
export class SpreadsheetImportModule {}
