import { ForbiddenException, HttpException } from '@nestjs/common';
import { AttemptLimiter } from './attempt-limiter.js';
import {
  ADMIN_PIN,
  ADMIN_USER,
  CAIXA_USER,
  FAKE_MANAGER_PIN,
  FakeOrigin,
  FakeSecurityLog,
  FakeUserRepository,
} from './auth-fakes.fixture.js';
import {
  MANAGER_DENIED,
  MANAGER_REQUIRED,
  ManagerPinAuthorizer,
} from './manager-authorizer.js';
import { hashPassword } from './password-hasher.js';
import type { AdminPin } from './user-repository.js';

function build(
  origin = new FakeOrigin(),
  log = new FakeSecurityLog(),
  pins: AdminPin[] = [ADMIN_PIN],
) {
  const users = new FakeUserRepository([CAIXA_USER, ADMIN_USER], pins);
  return new ManagerPinAuthorizer(
    users,
    new AttemptLimiter(() => 0),
    origin.read,
    log.write,
  );
}

/** O admin que liberou, ou o código/status do erro. */
async function outcomeOf(promise: Promise<number>): Promise<unknown> {
  try {
    return await promise;
  } catch (error) {
    const body = (error as ForbiddenException).getResponse() as {
      code?: string;
    };
    return body.code ?? (error as HttpException).getStatus();
  }
}

describe('ManagerPinAuthorizer', () => {
  it('o código de um admin ativo passa e diz quem liberou', async () => {
    expect(await build().authorize(FAKE_MANAGER_PIN)).toBe(ADMIN_PIN.userId);
  });

  it('com dois admins, devolve o dono do código digitado', async () => {
    const other: AdminPin = { userId: 9, pinHash: hashPassword('739164') };
    const authorizer = build(undefined, undefined, [ADMIN_PIN, other]);
    expect(await authorizer.authorize('739164')).toBe(9);
  });

  it('sem código: 403 com o código para a tela pedir', async () => {
    expect(await outcomeOf(build().authorize(undefined))).toBe(
      MANAGER_REQUIRED,
    );
    expect(await outcomeOf(build().authorize(''))).toBe(MANAGER_REQUIRED);
  });

  it('a senha de login do admin não vale mais na trava (S-04)', async () => {
    expect(await outcomeOf(build().authorize('admin123'))).toBe(MANAGER_DENIED);
  });

  it('sem nenhum código cadastrado nada passa, nem a senha do admin', async () => {
    const authorizer = build(undefined, undefined, []);
    await expect(authorizer.authorize('admin123')).rejects.toThrow(
      /Nenhum código do gerente cadastrado/,
    );
  });

  it('5 códigos errados travam: nem o certo passa até esperar (429)', async () => {
    const authorizer = build();
    for (let i = 0; i < 5; i++) await outcomeOf(authorizer.authorize('111222'));
    expect(await outcomeOf(authorizer.authorize(FAKE_MANAGER_PIN))).toBe(429);
  });

  it('a trava é do aparelho: um caixa chutando não fecha o código no balcão', async () => {
    const origin = new FakeOrigin('10.0.0.66');
    const authorizer = build(origin);
    for (let i = 0; i < 5; i++) await outcomeOf(authorizer.authorize('111222'));
    origin.ip = '10.0.0.2';
    expect(await outcomeOf(authorizer.authorize(FAKE_MANAGER_PIN))).toBe(1);
  });

  it('24 errados + o certo ao mesmo tempo: no máximo 5 conferidos', async () => {
    const authorizer = build();
    const outcomes = await Promise.all([
      ...Array.from({ length: 24 }, () =>
        outcomeOf(authorizer.authorize('111222')),
      ),
      outcomeOf(authorizer.authorize(FAKE_MANAGER_PIN)),
    ]);
    expect(outcomes.filter((outcome) => outcome !== 429)).toHaveLength(5);
    expect(outcomes[24]).toBe(429);
  });

  it('registra o código negado com o aparelho, sem o código', async () => {
    const log = new FakeSecurityLog();
    await outcomeOf(build(new FakeOrigin('10.0.0.9'), log).authorize('111222'));
    expect(log.entries).toEqual([
      { event: 'manager_denied', origin: '10.0.0.9' },
    ]);
  });
});
