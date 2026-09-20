import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { AuthenticatedRequest } from './auth.guard.js';
import type { SessionUser } from './session-user.js';

/**
 * Injeta o usuário logado no parâmetro do handler. Só use em rotas não públicas:
 * o `AuthGuard` garante que `request.user` existe nelas.
 *
 * @example close(@CurrentUser() user: SessionUser) {}
 */
export const CurrentUser = createParamDecorator(
  (_input: undefined, context: ExecutionContext): SessionUser => {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    return request.user as SessionUser;
  },
);
