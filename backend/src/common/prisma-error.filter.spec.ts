import { Controller, Get, Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import type { PrismaFailureLogEntry } from './prisma-error.js';
import { PrismaErrorFilter } from './prisma-error.filter.js';

/** Erro como o Prisma lança: a mensagem repete a chamada com os argumentos. */
class FakePrismaValidationError extends Error {
  override name = 'PrismaClientValidationError';
}

/** Guarda as linhas em vez de escrever no console. */
class FakePrismaFailureLog {
  readonly entries: PrismaFailureLogEntry[] = [];
  readonly write = (entry: PrismaFailureLogEntry): void => {
    this.entries.push(entry);
  };
}

@Controller()
class FailingController {
  @Get('prisma')
  prisma(): never {
    throw new FakePrismaValidationError(
      'Invalid `prisma.customer.update()` invocation:\n\n{ data: { name: "Maria Silva", phone: "11987654321" } }',
    );
  }

  @Get('conflict')
  conflict(): never {
    throw Object.assign(new Error('unique'), {
      code: 'P2002',
      meta: { target: ['phone'] },
    });
  }
}

@Module({ controllers: [FailingController] })
class FailingModule {}

describe('PrismaErrorFilter (S-19)', () => {
  let app: NestExpressApplication;
  const log = new FakePrismaFailureLog();

  beforeAll(async () => {
    app = await NestFactory.create<NestExpressApplication>(FailingModule, {
      logger: false,
    });
    app.useGlobalFilters(
      new PrismaErrorFilter(app.getHttpAdapter(), log.write),
    );
    await app.init();
  });

  afterAll(() => app.close());

  it('erro do Prisma sem tratamento: 500 genérico e log sem nome nem telefone', async () => {
    const response = await request(app.getHttpServer())
      .get('/prisma')
      .expect(500);
    expect(JSON.stringify(response.body)).not.toContain('Maria');
    expect(log.entries).toEqual([
      {
        event: 'prisma_error',
        name: 'PrismaClientValidationError',
        code: null,
        summary: 'Invalid `prisma.customer.update()` invocation:',
      },
    ]);
    expect(JSON.stringify(log.entries)).not.toContain('11987654321');
  });

  it('o que o mapPrismaError já conhece continua com o status dele', async () => {
    await request(app.getHttpServer()).get('/conflict').expect(409);
  });
});
