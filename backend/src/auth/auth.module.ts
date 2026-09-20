import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AuthController } from './auth.controller.js';
import { AuthGuard } from './auth.guard.js';
import { AuthService } from './auth.service.js';
import { PrismaUserRepository } from './prisma-user.repository.js';
import { SessionStore } from './session-store.js';
import { USER_REPOSITORY } from './user-repository.js';

const SESSION_TTL_MS = 12 * 60 * 60 * 1000; // um turno de trabalho

@Module({
  controllers: [AuthController],
  providers: [
    AuthService,
    { provide: USER_REPOSITORY, useClass: PrismaUserRepository },
    {
      provide: SessionStore,
      useFactory: () => new SessionStore(Date.now, SESSION_TTL_MS),
    },
    // Global: toda rota exige login, exceto as marcadas com @Public().
    { provide: APP_GUARD, useClass: AuthGuard },
  ],
  exports: [AuthService],
})
export class AuthModule {}
