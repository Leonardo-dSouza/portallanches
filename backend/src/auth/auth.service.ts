import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { verifyPassword } from './password-hasher.js';
import { SessionStore } from './session-store.js';
import { SessionUser } from './session-user.js';
import { USER_REPOSITORY, type UserRepository } from './user-repository.js';

export interface LoginResult {
  token: string;
  user: SessionUser;
}

@Injectable()
export class AuthService {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(SessionStore) private readonly sessions: SessionStore,
  ) {}

  /**
   * Valida usuário e senha e abre uma sessão.
   *
   * @example const { token } = await auth.login('caixa', 'caixa123');
   */
  async login(username: string, password: string): Promise<LoginResult> {
    const stored = await this.users.findActiveByUsername(username);
    if (!stored || !verifyPassword(password, stored.passwordHash)) {
      throw new UnauthorizedException(
        `Credenciais inválidas para o usuário "${username}"`,
      );
    }
    const user: SessionUser = {
      id: stored.id,
      name: stored.name,
      role: stored.role,
    };
    return { token: this.sessions.create(user), user };
  }

  logout(token: string): void {
    this.sessions.delete(token);
  }

  authenticate(token: string): SessionUser | undefined {
    return this.sessions.find(token);
  }
}
