import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { AttemptLimiter } from './attempt-limiter.js';
import {
  CAIXA_USER,
  FakeOrigin,
  FakeSecurityLog,
  FakeUserRepository,
} from './auth-fakes.fixture.js';
import { SessionStore } from './session-store.js';

function buildService(
  origin = new FakeOrigin(),
  log = new FakeSecurityLog(),
): AuthService {
  return new AuthService(
    new FakeUserRepository([CAIXA_USER]),
    new SessionStore(() => 0, 1000),
    new AttemptLimiter(() => 0),
    origin.read,
    log.write,
  );
}

/** Status HTTP de cada login, na ordem em que foram pedidos. */
async function statusesOf(logins: Promise<unknown>[]): Promise<number[]> {
  const settled = await Promise.allSettled(logins);
  return settled.map((result) =>
    result.status === 'fulfilled'
      ? 200
      : (result.reason as { getStatus(): number }).getStatus(),
  );
}

describe('AuthService', () => {
  it('abre sessão com credenciais corretas', async () => {
    const auth = buildService();
    const { token, user } = await auth.login('caixa', 'caixa123');
    expect(user).toEqual({ id: 2, name: 'caixa', role: 'CAIXA' });
    expect(auth.authenticate(token)).toEqual(user);
  });

  it('rejeita senha incorreta', async () => {
    await expect(buildService().login('caixa', 'errada')).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('rejeita usuário inexistente', async () => {
    await expect(buildService().login('ninguem', 'x')).rejects.toThrow(
      /"ninguem"/,
    );
  });

  it('5 senhas erradas seguidas travam o login daquele usuário (429), até a certa', async () => {
    const auth = buildService();
    for (let i = 0; i < 5; i++)
      await expect(auth.login('caixa', 'chute')).rejects.toThrow(
        UnauthorizedException,
      );
    await expect(auth.login('caixa', 'caixa123')).rejects.toThrow(
      /Muitas tentativas/,
    );
  });

  it('a trava é do aparelho que errou: o PC do balcão continua entrando', async () => {
    const origin = new FakeOrigin('10.0.0.66');
    const auth = buildService(origin);
    for (let i = 0; i < 5; i++)
      await auth.login('caixa', 'chute').catch(() => undefined);
    origin.ip = '10.0.0.2';
    await expect(auth.login('caixa', 'caixa123')).resolves.toBeDefined();
  });

  it('13 erradas + a certa ao mesmo tempo: no máximo 5 conferidas, a certa só passa entre elas', async () => {
    const auth = buildService();
    const attempts = [
      ...Array.from({ length: 13 }, () => auth.login('caixa', 'chute')),
      auth.login('caixa', 'caixa123'),
    ];
    const statuses = await statusesOf(attempts);
    expect(statuses.filter((status) => status !== 429)).toHaveLength(5);
    expect(statuses[13]).toBe(429);
  });

  it('20 erros do mesmo aparelho em usuários diferentes travam o aparelho', async () => {
    const auth = buildService();
    for (let i = 0; i < 20; i++)
      await auth.login(`chute${i}`, 'x').catch(() => undefined);
    await expect(auth.login('caixa', 'caixa123')).rejects.toThrow(
      /Muitas tentativas/,
    );
  });

  it('usuário fora do padrão: 400 sem repetir o que veio e sem contar tentativa', async () => {
    const auth = buildService();
    const huge = 'A'.repeat(300_000);
    const error = await auth.login(huge, 'x').then(
      () => null,
      (caught: Error) => caught,
    );
    expect(error).toBeInstanceOf(BadRequestException);
    expect(error?.message.length).toBeLessThan(300);
    for (let i = 0; i < 10; i++)
      await auth.login('Caixa', 'x').catch(() => undefined);
    await expect(auth.login('caixa', 'caixa123')).resolves.toBeDefined();
  });

  it('senha com mais de 128 caracteres: 400', async () => {
    await expect(
      buildService().login('caixa', 'x'.repeat(129)),
    ).rejects.toThrow(BadRequestException);
  });

  it('registra o login errado com usuário e aparelho, nunca a senha', async () => {
    const log = new FakeSecurityLog();
    await buildService(new FakeOrigin('10.0.0.9'), log)
      .login('caixa', 'segredo-errado')
      .catch(() => undefined);
    expect(log.entries).toEqual([
      { event: 'login_failed', origin: '10.0.0.9', username: 'caixa' },
    ]);
    expect(JSON.stringify(log.entries)).not.toContain('segredo-errado');
  });

  it('encerra a sessão no logout', async () => {
    const auth = buildService();
    const { token } = await auth.login('caixa', 'caixa123');
    auth.logout(token);
    expect(auth.authenticate(token)).toBeUndefined();
  });
});
