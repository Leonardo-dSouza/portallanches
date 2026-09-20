import { DatabaseClient, PrismaService } from './prisma.service.js';

class FakeDatabaseClient implements DatabaseClient {
  readonly calls: string[] = [];

  async $connect(): Promise<void> {
    this.calls.push('connect');
  }

  async $disconnect(): Promise<void> {
    this.calls.push('disconnect');
  }
}

describe('PrismaService', () => {
  it('conecta ao iniciar o módulo', async () => {
    const fake = new FakeDatabaseClient();
    await new PrismaService(fake).onModuleInit();
    expect(fake.calls).toEqual(['connect']);
  });

  it('desconecta ao encerrar o módulo', async () => {
    const fake = new FakeDatabaseClient();
    await new PrismaService(fake).onModuleDestroy();
    expect(fake.calls).toEqual(['disconnect']);
  });
});
