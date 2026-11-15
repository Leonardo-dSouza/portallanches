import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import {
  REQUEST_ORIGIN,
  type RequestOrigin,
} from '../common/request-origin.js';
import { AttemptLimiter } from './attempt-limiter.js';
import { loginAttemptRules } from './attempt-rules.js';
import { assertLoginShape } from './credential-rules.js';
import { hashPassword, verifyPassword } from './password-hasher.js';
import { SECURITY_LOG, type SecurityLog } from './security-log.js';
import { SessionStore } from './session-store.js';
import { SessionUser } from './session-user.js';
import {
  USER_REPOSITORY,
  type StoredUser,
  type UserRepository,
} from './user-repository.js';

/**
 * Hash de uma senha que ninguém sabe: usuário inexistente também paga um scrypt, para o tempo da
 * resposta não dizer se o nome existe (antes: ~6 ms contra ~43 ms, S-18 do mapa de segurança).
 */
const DECOY_HASH = hashPassword(randomBytes(16).toString('hex'));

export interface LoginResult {
  token: string;
  user: SessionUser;
}

@Injectable()
export class AuthService {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(SessionStore) private readonly sessions: SessionStore,
    @Inject(AttemptLimiter) private readonly limiter: AttemptLimiter,
    @Inject(REQUEST_ORIGIN) private readonly origin: RequestOrigin,
    @Inject(SECURITY_LOG) private readonly log: SecurityLog,
  ) {}

  /**
   * Valida usuário e senha e abre uma sessão.
   *
   * @example const { token } = await auth.login('caixa', 'caixa123');
   */
  async login(username: string, password: string): Promise<LoginResult> {
    assertLoginShape(username, password);
    const origin = this.origin();
    const stored = await this.limiter.attempt(
      loginAttemptRules(username, origin),
      () => this.findWithPassword(username, password),
    );
    if (!stored) {
      this.log({ event: 'login_failed', origin, username });
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

  private async findWithPassword(
    username: string,
    password: string,
  ): Promise<StoredUser | null> {
    const stored = await this.users.findActiveByUsername(username);
    const matches = await verifyPassword(
      password,
      stored?.passwordHash ?? DECOY_HASH,
    );
    return stored && matches ? stored : null;
  }

  logout(token: string): void {
    this.sessions.delete(token);
  }

  /** Encerra todas as sessões abertas de um usuário. */
  revokeSessions(userId: number): void {
    this.sessions.deleteByUserId(userId);
  }

  authenticate(token: string): SessionUser | undefined {
    return this.sessions.find(token);
  }
}
