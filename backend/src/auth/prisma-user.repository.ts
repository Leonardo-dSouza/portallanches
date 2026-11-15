import { Inject, Injectable } from '@nestjs/common';
import { PrismaClient } from '../generated/prisma/client.js';
import { DATABASE_CLIENT } from '../prisma/prisma.service.js';
import type {
  AdminPin,
  StoredUser,
  UserRepository,
} from './user-repository.js';

@Injectable()
export class PrismaUserRepository implements UserRepository {
  constructor(@Inject(DATABASE_CLIENT) private readonly prisma: PrismaClient) {}

  findActiveByUsername(username: string): Promise<StoredUser | null> {
    return this.prisma.user.findFirst({
      where: { username, active: true },
      select: { id: true, name: true, role: true, passwordHash: true },
    });
  }

  async listActiveAdminPins(): Promise<AdminPin[]> {
    const admins = await this.prisma.user.findMany({
      where: { role: 'ADMIN', active: true, managerPinHash: { not: null } },
      select: { id: true, managerPinHash: true },
      orderBy: { id: 'asc' },
    });
    return admins.map((admin) => ({
      userId: admin.id,
      pinHash: admin.managerPinHash ?? '',
    }));
  }
}
