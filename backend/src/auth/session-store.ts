import { randomBytes } from 'node:crypto';
import { SessionUser } from './session-user.js';

interface StoredSession {
  user: SessionUser;
  expiresAt: number;
}

/**
 * Sessões em memória. Para o porte do projeto (poucos usuários, um servidor)
 * isso basta; reiniciar o servidor apenas exige novo login.
 * O relógio é injetado para os testes não dependerem de tempo real.
 *
 * @example const token = store.create({ id: 1, name: 'admin', role: 'ADMIN' });
 */
export class SessionStore {
  private readonly sessions = new Map<string, StoredSession>();

  constructor(
    private readonly now: () => number,
    private readonly ttlMs: number,
  ) {}

  create(user: SessionUser): string {
    const token = randomBytes(32).toString('hex');
    this.sessions.set(token, { user, expiresAt: this.now() + this.ttlMs });
    return token;
  }

  find(token: string): SessionUser | undefined {
    const session = this.sessions.get(token);
    if (!session) return undefined;
    if (session.expiresAt <= this.now()) {
      this.sessions.delete(token);
      return undefined;
    }
    return session.user;
  }

  delete(token: string): void {
    this.sessions.delete(token);
  }

  /** Encerra todas as sessões de um usuário (ex.: desativado ou senha trocada). */
  deleteByUserId(userId: number): void {
    for (const [token, session] of this.sessions) {
      if (session.user.id === userId) this.sessions.delete(token);
    }
  }
}
