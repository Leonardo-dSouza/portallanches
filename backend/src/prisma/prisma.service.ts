import {
  Inject,
  Injectable,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';

export const DATABASE_CLIENT = Symbol('DATABASE_CLIENT');

/** Contrato mínimo do client do banco que o ciclo de vida da aplicação usa. */
export interface DatabaseClient {
  $connect(): Promise<void>;
  $disconnect(): Promise<void>;
}

/**
 * Liga o client do Prisma ao ciclo de vida do Nest: conecta ao subir e
 * desconecta ao encerrar. O client é injetado (token `DATABASE_CLIENT`).
 *
 * @example constructor(private readonly prisma: PrismaService) {}
 */
@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  constructor(
    @Inject(DATABASE_CLIENT) private readonly client: DatabaseClient,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.client.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.$disconnect();
  }
}
