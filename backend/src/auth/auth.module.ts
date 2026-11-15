import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import {
  currentRequestOrigin,
  REQUEST_ORIGIN,
} from '../common/request-origin.js';
import { AuthController } from './auth.controller.js';
import { AuthGuard } from './auth.guard.js';
import { AttemptLimiter } from './attempt-limiter.js';
import { AuthService } from './auth.service.js';
import {
  AdminPasswordAuthorizer,
  MANAGER_AUTHORIZER,
} from './manager-authorizer.js';
import { PrismaUserRepository } from './prisma-user.repository.js';
import { jsonSecurityLog, SECURITY_LOG } from './security-log.js';
import { SessionStore } from './session-store.js';
import { SESSION_REVOKER } from './session-revoker.js';
import { USER_REPOSITORY } from './user-repository.js';

const SESSION_TTL_MS = 12 * 60 * 60 * 1000; // um turno de trabalho

@Module({
  controllers: [AuthController],
  providers: [
    AuthService,
    { provide: SESSION_REVOKER, useExisting: AuthService },
    { provide: USER_REPOSITORY, useClass: PrismaUserRepository },
    {
      provide: SessionStore,
      useFactory: () => new SessionStore(Date.now, SESSION_TTL_MS),
    },
    { provide: AttemptLimiter, useFactory: () => new AttemptLimiter(Date.now) },
    { provide: REQUEST_ORIGIN, useValue: currentRequestOrigin },
    { provide: SECURITY_LOG, useValue: jsonSecurityLog },
    { provide: MANAGER_AUTHORIZER, useClass: AdminPasswordAuthorizer },
    // Global: toda rota exige login, exceto as marcadas com @Public().
    { provide: APP_GUARD, useClass: AuthGuard },
  ],
  exports: [AuthService, SESSION_REVOKER, MANAGER_AUTHORIZER],
})
export class AuthModule {}
