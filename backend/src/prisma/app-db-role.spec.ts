import {
  APP_DB_ROLE,
  appDbRoleStatements,
  parseAppDbPassword,
} from './app-db-role.js';

const PASSWORD = 'k3J9q8Lm2Zx7Vb4N';

describe('usuário do banco do app (S-21)', () => {
  it('aceita só 16 a 128 letras e números, sem repetir a senha no erro', () => {
    expect(parseAppDbPassword(PASSWORD)).toBe(PASSWORD);
    for (const bad of [
      undefined,
      'curta123',
      `${PASSWORD}'; DROP`,
      'a'.repeat(129),
    ])
      expect(() => parseAppDbPassword(bad)).toThrow(
        /16 a 128 letras e números/,
      );
    expect(() => parseAppDbPassword('senha com espaco 123')).not.toThrow(
      /espaco/,
    );
  });

  it('o usuário não é superusuário, não cria tabela e não toca nas migrations', () => {
    const sql = appDbRoleStatements(PASSWORD, 'portallanches').join('\n');
    expect(sql).toContain('NOSUPERUSER NOCREATEDB NOCREATEROLE');
    expect(sql).toContain(
      `REVOKE CREATE ON SCHEMA public FROM "${APP_DB_ROLE}"`,
    );
    expect(sql).toContain(
      `REVOKE ALL ON TABLE public."_prisma_migrations" FROM "${APP_DB_ROLE}"`,
    );
    expect(sql).not.toMatch(/GRANT ALL|SUPERUSER (?!NO)/);
  });

  it('as tabelas das próximas migrations já nascem liberadas', () => {
    const sql = appDbRoleStatements(PASSWORD, 'portallanches').join('\n');
    expect(sql).toContain(
      'ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES',
    );
  });

  it('recusa nome de banco fora do formato simples', () => {
    expect(() => appDbRoleStatements(PASSWORD, 'banco"; DROP')).toThrow(
      /Nome inválido/,
    );
  });
});
