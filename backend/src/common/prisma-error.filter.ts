import {
  ArgumentsHost,
  Catch,
  InternalServerErrorException,
  type HttpServer,
} from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import {
  mapPrismaError,
  prismaFailureOf,
  type PrismaFailureLog,
} from './prisma-error.js';

/**
 * Filtro global: aplica `mapPrismaError`; o erro do Prisma sem tratamento vira 500 genérico com
 * uma linha de log sem os argumentos (S-19); o resto fica com o tratamento padrão do Nest.
 *
 * @example new PrismaErrorFilter(app.getHttpAdapter(), jsonPrismaFailureLog)
 */
@Catch()
export class PrismaErrorFilter extends BaseExceptionFilter {
  constructor(
    applicationRef: HttpServer,
    private readonly log: PrismaFailureLog,
  ) {
    super(applicationRef);
  }

  override catch(exception: unknown, host: ArgumentsHost): void {
    const mapped = mapPrismaError(exception);
    if (mapped) return super.catch(mapped, host);
    const failure = prismaFailureOf(exception);
    if (!failure) return super.catch(exception, host);
    this.log(failure);
    super.catch(new InternalServerErrorException(), host);
  }
}
