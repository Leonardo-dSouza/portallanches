import {
  Body,
  Controller,
  HttpCode,
  Inject,
  Param,
  Post,
} from '@nestjs/common';
import { Roles } from '../auth/auth-decorators.js';
import { parseImportRequest } from './import-request.js';
import {
  SpreadsheetImportService,
  type SpreadsheetImportResult,
} from './spreadsheet-import.service.js';

/** Importação de planilhas pela tela do admin; sem `apply: true` é só simulação. */
@Controller('imports')
export class SpreadsheetImportController {
  constructor(
    @Inject(SpreadsheetImportService)
    private readonly imports: SpreadsheetImportService,
  ) {}

  @Roles('ADMIN')
  @Post(':kind')
  @HttpCode(200)
  run(
    @Param('kind') kind: string,
    @Body() body: unknown,
  ): Promise<SpreadsheetImportResult> {
    return this.imports.run(parseImportRequest(kind, body));
  }
}
