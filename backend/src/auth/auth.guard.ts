import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY, ROLES_KEY } from './auth-decorators.js';
import { AuthService } from './auth.service.js';
import { extractBearerToken } from './bearer-token.js';
import { SessionUser, UserRole } from './session-user.js';

export interface AuthenticatedRequest {
  headers: { authorization?: string };
  user?: SessionUser;
}

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    @Inject(Reflector) private readonly reflector: Reflector,
    @Inject(AuthService) private readonly auth: AuthService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    if (this.readMetadata<boolean>(IS_PUBLIC_KEY, context)) return true;
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = this.authenticate(request);
    const roles = this.readMetadata<UserRole[]>(ROLES_KEY, context);
    if (roles && !roles.includes(user.role)) {
      throw new ForbiddenException(
        `Perfil "${user.role}" sem acesso: esperado um de [${roles.join(', ')}]`,
      );
    }
    request.user = user;
    return true;
  }

  private authenticate(request: AuthenticatedRequest): SessionUser {
    const token = extractBearerToken(request.headers.authorization);
    const user = token ? this.auth.authenticate(token) : undefined;
    if (!user) {
      throw new UnauthorizedException(
        'Sessão ausente ou expirada: esperado header "Authorization: Bearer <token>" de um login válido',
      );
    }
    return user;
  }

  private readMetadata<T>(
    key: string,
    context: ExecutionContext,
  ): T | undefined {
    return this.reflector.getAllAndOverride<T | undefined>(key, [
      context.getHandler(),
      context.getClass(),
    ]);
  }
}
