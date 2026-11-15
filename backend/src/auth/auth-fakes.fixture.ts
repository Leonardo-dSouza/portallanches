import { ForbiddenException } from '@nestjs/common';
import {
  MANAGER_DENIED,
  MANAGER_REQUIRED,
  type ManagerAuthorizer,
} from './manager-authorizer.js';
import { hashPassword } from './password-hasher.js';
import type { SecurityEvent } from './security-log.js';
import type {
  AdminPin,
  StoredUser,
  UserRepository,
} from './user-repository.js';

/** Usuários em memória, procurados pelo nome (como o `username` da tabela), e os códigos do gerente. */
export class FakeUserRepository implements UserRepository {
  constructor(
    private readonly users: StoredUser[],
    readonly pins: AdminPin[] = [],
  ) {}

  async findActiveByUsername(username: string): Promise<StoredUser | null> {
    return this.users.find((user) => user.name === username) ?? null;
  }

  async listActiveAdminPins(): Promise<AdminPin[]> {
    return this.pins;
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

/** Código do gerente dos testes (do admin de id 1). */
export const FAKE_MANAGER_PIN = '482915';

/** O código do admin de id 1, como o repositório guarda. */
export const ADMIN_PIN: AdminPin = {
  userId: 1,
  pinHash: hashPassword(FAKE_MANAGER_PIN),
};

/** Código do gerente dos testes: o certo devolve o admin 1; vazio ou errado recusa como o real. */
export class FakeManagerAuthorizer implements ManagerAuthorizer {
  /** Cada código recebido, para o teste conferir quando foi pedido. */
  readonly received: unknown[] = [];

  async authorize(pin: unknown): Promise<number> {
    this.received.push(pin);
    if (pin === FAKE_MANAGER_PIN) return ADMIN_PIN.userId;
    const code = pin ? MANAGER_DENIED : MANAGER_REQUIRED;
    throw new ForbiddenException({
      statusCode: 403,
      code,
      message: `código do gerente: ${code}`,
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
