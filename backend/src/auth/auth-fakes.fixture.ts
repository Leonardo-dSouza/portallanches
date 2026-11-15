import { ForbiddenException } from '@nestjs/common';
import {
  MANAGER_DENIED,
  MANAGER_REQUIRED,
  type ManagerAuthorizer,
} from './manager-authorizer.js';
import { hashPassword } from './password-hasher.js';
import type { SecurityEvent } from './security-log.js';
import type { StoredUser, UserRepository } from './user-repository.js';

/** Usuários em memória, procurados pelo nome (como o `username` da tabela). */
export class FakeUserRepository implements UserRepository {
  constructor(private readonly users: StoredUser[]) {}

  async findActiveByUsername(username: string): Promise<StoredUser | null> {
    return this.users.find((user) => user.name === username) ?? null;
  }

  async listActiveAdminHashes(): Promise<string[]> {
    return this.users
      .filter((user) => user.role === 'ADMIN')
      .map((user) => user.passwordHash);
  }
}

export const CAIXA_USER: StoredUser = {
  id: 2,
  name: 'caixa',
  role: 'CAIXA',
  passwordHash: hashPassword('caixa123'),
};

export const ADMIN_USER: StoredUser = {
  id: 1,
  name: 'admin',
  role: 'ADMIN',
  passwordHash: hashPassword('admin123'),
};

/** Senha do admin dos testes: a certa passa; vazia ou errada recusa como o autorizador real. */
export class FakeManagerAuthorizer implements ManagerAuthorizer {
  /** Cada senha recebida, para o teste conferir quando foi pedida. */
  readonly received: unknown[] = [];

  async authorize(password: unknown): Promise<void> {
    this.received.push(password);
    if (password === 'admin123') return;
    const code = password ? MANAGER_DENIED : MANAGER_REQUIRED;
    throw new ForbiddenException({
      statusCode: 403,
      code,
      message: `senha do admin: ${code}`,
    });
  }
}

/** Aparelho de onde vem o pedido; o teste troca o IP no meio. */
export class FakeOrigin {
  constructor(public ip = '10.0.0.2') {}
  readonly read = (): string => this.ip;
}

/** Guarda os eventos em vez de escrever no log. */
export class FakeSecurityLog {
  readonly entries: SecurityEvent[] = [];
  readonly write = (entry: SecurityEvent): void => {
    this.entries.push(entry);
  };
}

/** Relógio que o teste empurra. */
export class FakeClock {
  ms = 0;
  readonly now = (): number => this.ms;
}
