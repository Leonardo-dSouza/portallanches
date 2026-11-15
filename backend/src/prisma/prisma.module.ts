import { Global, Module } from '@nestjs/common';
import { APP_FILTER, HttpAdapterHost } from '@nestjs/core';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.js';
import { jsonPrismaFailureLog } from '../common/prisma-error.js';
import { PrismaErrorFilter } from '../common/prisma-error.filter.js';
import { DATABASE_CLIENT, PrismaService } from './prisma.service.js';

const DEFAULT_DATABASE_URL =
  'postgresql://postgres:postgres@localhost:15433/portallanches';

function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL ?? DEFAULT_DATABASE_URL;
  return new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
}

@Global()
@Module({
  providers: [
    { provide: DATABASE_CLIENT, useFactory: createPrismaClient },
    PrismaService,
    {
      provide: APP_FILTER,
      useFactory: (host: HttpAdapterHost) =>
        new PrismaErrorFilter(host.httpAdapter, jsonPrismaFailureLog),
      inject: [HttpAdapterHost],
    },
  ],
  exports: [DATABASE_CLIENT, PrismaService],
})
export class PrismaModule {}
