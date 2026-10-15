import { ForbiddenException, HttpException } from '@nestjs/common';
import { AttemptLimiter } from './attempt-limiter.js';
import {
  ADMIN_USER,
  CAIXA_USER,
  FakeUserRepository,
} from './auth-fakes.fixture.js';
import {
  AdminPasswordAuthorizer,
  MANAGER_DENIED,
  MANAGER_REQUIRED,
} from './manager-authorizer.js';

function build() {
  const users = new FakeUserRepository([CAIXA_USER, ADMIN_USER]);
  return new AdminPasswordAuthorizer(users, new AttemptLimiter(() => 0));
}

async function codeOf(promise: Promise<void>): Promise<unknown> {
  try {
    await promise;
    return null;
  } catch (error) {
    const body = (error as ForbiddenException).getResponse() as {
      code?: string;
    };
    return body.code ?? (error as HttpException).getStatus();
  }
}

describe('AdminPasswordAuthorizer', () => {
  it('a senha de um admin ativo passa', async () => {
    await expect(build().authorize('admin123')).resolves.toBeUndefined();
  });

  it('sem senha: 403 com o código para a tela pedir', async () => {
    expect(await codeOf(build().authorize(undefined))).toBe(MANAGER_REQUIRED);
    expect(await codeOf(build().authorize(''))).toBe(MANAGER_REQUIRED);
  });

  it('a senha do caixa não vale como a do admin', async () => {
    expect(await codeOf(build().authorize('caixa123'))).toBe(MANAGER_DENIED);
  });

  it('5 senhas erradas travam: nem a certa passa até esperar (429)', async () => {
    const authorizer = build();
    for (let i = 0; i < 5; i++) await codeOf(authorizer.authorize('chute'));
    expect(await codeOf(authorizer.authorize('admin123'))).toBe(429);
  });
});
