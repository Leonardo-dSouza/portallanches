import {
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY, ROLES_KEY } from './auth-decorators.js';
import { AuthService } from './auth.service.js';
import { AuthenticatedRequest, AuthGuard } from './auth.guard.js';
import { SessionUser, UserRole } from './session-user.js';

const CAIXA: SessionUser = { id: 2, name: 'caixa', role: 'CAIXA' };

class FakeAuthService {
  authenticate(token: string): SessionUser | undefined {
    return token === 'valido' ? CAIXA : undefined;
  }
}

class FakeReflector {
  constructor(private readonly metadata: Record<string, unknown>) {}

  getAllAndOverride(key: string): unknown {
    return this.metadata[key];
  }
}

function buildContext(request: AuthenticatedRequest): ExecutionContext {
  return {
    getHandler: () => undefined,
    getClass: () => undefined,
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

function buildGuard(metadata: Record<string, unknown> = {}): AuthGuard {
  return new AuthGuard(
    new FakeReflector(metadata) as unknown as Reflector,
    new FakeAuthService() as unknown as AuthService,
  );
}

const withToken = (token: string): AuthenticatedRequest => ({
  headers: { authorization: `Bearer ${token}` },
});

describe('AuthGuard', () => {
  it('libera rota pública sem token', () => {
    const guard = buildGuard({ [IS_PUBLIC_KEY]: true });
    expect(guard.canActivate(buildContext({ headers: {} }))).toBe(true);
  });

  it('rejeita requisição sem token', () => {
    expect(() =>
      buildGuard().canActivate(buildContext({ headers: {} })),
    ).toThrow(UnauthorizedException);
  });

  it('rejeita token inválido', () => {
    expect(() =>
      buildGuard().canActivate(buildContext(withToken('falso'))),
    ).toThrow(UnauthorizedException);
  });

  it('anexa o usuário à requisição com token válido', () => {
    const request = withToken('valido');
    buildGuard().canActivate(buildContext(request));
    expect(request.user).toEqual(CAIXA);
  });

  it('bloqueia perfil fora de @Roles com mensagem do perfil e esperados', () => {
    const roles: UserRole[] = ['ADMIN'];
    const guard = buildGuard({ [ROLES_KEY]: roles });
    expect(() => guard.canActivate(buildContext(withToken('valido')))).toThrow(
      ForbiddenException,
    );
  });

  it('permite perfil listado em @Roles', () => {
    const guard = buildGuard({ [ROLES_KEY]: ['CAIXA'] });
    expect(guard.canActivate(buildContext(withToken('valido')))).toBe(true);
  });
});
