import { Body, Controller, Module, Post, Put } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { carriesInvoicePage, setupHttpServer } from './http-setup.js';
import { currentRequestOrigin } from './request-origin.js';

/** Rotas de mentira com os mesmos caminhos das reais: devolvem o tamanho do corpo e a origem. */
@Controller()
class EchoController {
  @Post('auth/login')
  login(@Body() body: unknown) {
    return {
      size: JSON.stringify(body).length,
      origin: currentRequestOrigin(),
    };
  }

  @Post('expense-invoices/preview')
  preview(@Body() body: unknown) {
    return { size: JSON.stringify(body).length };
  }

  @Put('expenses/:id')
  updateExpense(@Body() body: unknown) {
    return { size: JSON.stringify(body).length };
  }
}

@Module({ controllers: [EchoController] })
class EchoModule {}

describe('setupHttpServer', () => {
  let app: NestExpressApplication;

  beforeAll(async () => {
    app = await NestFactory.create<NestExpressApplication>(EchoModule, {
      logger: false,
    });
    setupHttpServer(app);
    await app.init();
  });

  afterAll(() => app.close());

  const padded = (bytes: number) => ({ pad: 'x'.repeat(bytes) });

  it('login com 200 KB: 413 (antes cabiam 8 MB em qualquer rota)', async () => {
    await request(app.getHttpServer())
      .post('/auth/login')
      .send(padded(200_000))
      .expect(413);
  });

  it('login de tamanho normal passa', async () => {
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ username: 'caixa', password: 'caixa123' })
      .expect(201);
  });

  it('a prévia e a edição do gasto aceitam 1 MB de HTML; 4 MB não', async () => {
    const server = app.getHttpServer();
    await request(server)
      .post('/expense-invoices/preview')
      .send(padded(1_000_000))
      .expect(201);
    await request(server)
      .put('/expenses/7')
      .send(padded(1_000_000))
      .expect(200);
    await request(server)
      .put('/expenses/7')
      .send(padded(4_000_000))
      .expect(413);
  });

  it('o IP vem do salto confiável: o X-Forwarded-For escrito pelo cliente não manda', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .set('X-Forwarded-For', '6.6.6.6, 10.0.0.2')
      .send({});
    expect(response.body.origin).toBe('10.0.0.2');
  });

  it('não anuncia o Express', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({});
    expect(response.headers['x-powered-by']).toBeUndefined();
  });
});

describe('carriesInvoicePage', () => {
  it.each([
    ['POST', '/expense-invoices/preview', true],
    ['POST', '/expenses?date=2026-11-15', true],
    ['PUT', '/expenses/12', true],
    ['GET', '/expenses/12', false],
    ['POST', '/expenses/12/cancel', false],
    ['POST', '/auth/login', false],
    ['PUT', '/expenses/12/../../auth/login', false],
  ])('%s %s → %s', (method, url, expected) => {
    expect(carriesInvoicePage(method, url)).toBe(expected);
  });
});
