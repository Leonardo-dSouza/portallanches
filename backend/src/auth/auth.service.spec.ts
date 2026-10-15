import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { AttemptLimiter } from './attempt-limiter.js';
import { CAIXA_USER, FakeUserRepository } from './auth-fakes.fixture.js';
import { SessionStore } from './session-store.js';

function buildService(): AuthService {
  const sessions = new SessionStore(() => 0, 1000);
  return new AuthService(
    new FakeUserRepository([CAIXA_USER]),
    sessions,
    new AttemptLimiter(() => 0),
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

  it('encerra a sessão no logout', async () => {
    const auth = buildService();
    const { token } = await auth.login('caixa', 'caixa123');
    auth.logout(token);
    expect(auth.authenticate(token)).toBeUndefined();
  });
});
