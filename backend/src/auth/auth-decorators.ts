import { SetMetadata } from '@nestjs/common';
import { UserRole } from './session-user.js';

export const IS_PUBLIC_KEY = 'auth:isPublic';
export const ROLES_KEY = 'auth:roles';

/** Libera a rota do `AuthGuard` global (ex.: login). */
export const Public = (): MethodDecorator & ClassDecorator =>
  SetMetadata(IS_PUBLIC_KEY, true);

/**
 * Restringe a rota a determinados perfis; sem ele, qualquer usuário logado entra.
 *
 * @example @Roles('ADMIN') // só admin reabre fechamento
 */
export const Roles = (...roles: UserRole[]): MethodDecorator & ClassDecorator =>
  SetMetadata(ROLES_KEY, roles);
