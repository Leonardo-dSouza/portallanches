import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { hashPassword } from './password-hasher.js';
import { SessionStore } from './session-store.js';
import { StoredUser, UserRepository } from './user-repository.js';

class FakeUserRepository implements UserRepository {
  constructor(private readonly users: StoredUser[]) {}

  async findActiveByUsername(username: string): Promise<StoredUser | null> {
    return this.users.find((user) => user.name === username) ?? null;
  }
}

const CAIXA: StoredUser = {
  id: 2,
  name: 'caixa',
  role: 'CAIXA',
  passwordHash: hashPassword('caixa123'),
};

function buildService(): AuthService {
  const sessions = new SessionStore(() => 0, 1000);
  return new AuthService(new FakeUserRepository([CAIXA]), sessions);
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

  it('encerra a sessão no logout', async () => {
    const auth = buildService();
    const { token } = await auth.login('caixa', 'caixa123');
    auth.logout(token);
    expect(auth.authenticate(token)).toBeUndefined();
  });
});
