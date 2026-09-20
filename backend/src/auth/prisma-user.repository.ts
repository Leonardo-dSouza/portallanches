import { Inject, Injectable } from '@nestjs/common';
import { PrismaClient } from '../generated/prisma/client.js';
import { DATABASE_CLIENT } from '../prisma/prisma.service.js';
import { StoredUser, UserRepository } from './user-repository.js';

@Injectable()
export class PrismaUserRepository implements UserRepository {
  constructor(@Inject(DATABASE_CLIENT) private readonly prisma: PrismaClient) {}

  findActiveByUsername(username: string): Promise<StoredUser | null> {
    return this.prisma.user.findFirst({
      where: { username, active: true },
      select: { id: true, name: true, role: true, passwordHash: true },
    });
  }
}
