import { ArgumentsHost, Catch } from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import { mapPrismaError } from './prisma-error.js';

/** Filtro global: aplica `mapPrismaError` e deixa o resto com o tratamento padrão do Nest. */
@Catch()
export class PrismaErrorFilter extends BaseExceptionFilter {
  override catch(exception: unknown, host: ArgumentsHost): void {
    super.catch(mapPrismaError(exception) ?? exception, host);
  }
}
