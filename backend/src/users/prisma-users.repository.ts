import { Inject, Injectable } from '@nestjs/common';
import { PrismaClient } from '../generated/prisma/client.js';
import { DATABASE_CLIENT } from '../prisma/prisma.service.js';
import type {
  NewUserData,
  UserRecord,
  UsersRepository,
} from './users-repository.js';

const PUBLIC_FIELDS = {
  id: true,
  name: true,
  username: true,
  role: true,
  active: true,
} as const;

@Injectable()
export class PrismaUsersRepository implements UsersRepository {
  constructor(@Inject(DATABASE_CLIENT) private readonly prisma: PrismaClient) {}

  list(): Promise<UserRecord[]> {
    return this.prisma.user.findMany({
      select: PUBLIC_FIELDS,
      orderBy: { id: 'asc' },
    });
  }

  findById(id: number): Promise<UserRecord | null> {
    return this.prisma.user.findUnique({
      where: { id },
      select: PUBLIC_FIELDS,
    });
  }

  async findPasswordHash(id: number): Promise<string | null> {
    const row = await this.prisma.user.findUnique({
      where: { id },
      select: { passwordHash: true },
    });
    return row?.passwordHash ?? null;
  }

  create(data: NewUserData): Promise<UserRecord> {
    return this.prisma.user.create({ data, select: PUBLIC_FIELDS });
  }

  update(
    id: number,
    changes: Pick<UserRecord, 'name' | 'role' | 'active'>,
  ): Promise<UserRecord> {
    return this.prisma.user.update({
      where: { id },
      data: changes,
      select: PUBLIC_FIELDS,
    });
  }

  async updatePasswordHash(id: number, passwordHash: string): Promise<void> {
    await this.prisma.user.update({ where: { id }, data: { passwordHash } });
  }
}
