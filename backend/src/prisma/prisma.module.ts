import { Global, Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.js';
import { PrismaErrorFilter } from '../common/prisma-error.filter.js';
import { DATABASE_CLIENT, PrismaService } from './prisma.service.js';

const DEFAULT_DATABASE_URL =
  'postgresql://postgres:postgres@localhost:5432/portallanches';

function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL ?? DEFAULT_DATABASE_URL;
  return new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
}

@Global()
@Module({
  providers: [
    { provide: DATABASE_CLIENT, useFactory: createPrismaClient },
    PrismaService,
    { provide: APP_FILTER, useClass: PrismaErrorFilter },
  ],
  exports: [DATABASE_CLIENT, PrismaService],
})
export class PrismaModule {}
