/** Usuário do banco que o backend usa na produção (2026-11-15, S-21 do mapa de segurança). */
export const APP_DB_ROLE = 'portallanches_app';

/** Só letras e números (a senha vai dentro da URL do banco), 16 ou mais. */
const APP_DB_PASSWORD_PATTERN = /^[A-Za-z0-9]{16,128}$/;
const IDENTIFIER_PATTERN = /^[a-z_][a-z0-9_]*$/;

/**
 * Confere a senha do usuário do app antes de ela entrar no SQL. A mensagem nunca repete a senha.
 *
 * @example parseAppDbPassword(process.env.APP_DB_PASSWORD) // 'k3J9…'
 */
export function parseAppDbPassword(raw: string | undefined): string {
  if (raw !== undefined && APP_DB_PASSWORD_PATTERN.test(raw)) return raw;
  throw new Error(
    'APP_DB_PASSWORD inválida: esperado 16 a 128 letras e números no .env.prod',
  );
}

/** Aspas de identificador do Postgres, só para nomes já no formato simples. */
function quoteIdentifier(name: string): string {
  if (!IDENTIFIER_PATTERN.test(name))
    throw new Error(
      `Nome inválido "${name}": esperado letras minúsculas, números e sublinhado`,
    );
  return `"${name}"`;
}

/**
 * O SQL que deixa o usuário do app pronto: entra no banco, lê e grava as tabelas (inclusive as que
 * as próximas migrations criarem), mas não é superusuário, não cria tabela e não mexe no controle
 * das migrations. Até 2026-11-15 a API usava o dono do banco, que é superusuário: um erro futuro na
 * API teria o banco e o contêiner inteiros. Idempotente: roda a cada deploy (serviço `migrate`).
 *
 * @example appDbRoleStatements('k3J9…', 'portallanches')[0] // "DO $$ … CREATE ROLE …"
 */
export function appDbRoleStatements(
  password: string,
  database: string,
): string[] {
  const role = quoteIdentifier(APP_DB_ROLE);
  return [
    `DO $$ BEGIN IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = '${APP_DB_ROLE}') THEN CREATE ROLE ${role}; END IF; END $$`,
    `ALTER ROLE ${role} WITH LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS PASSWORD '${parseAppDbPassword(password)}'`,
    `GRANT CONNECT ON DATABASE ${quoteIdentifier(database)} TO ${role}`,
    `GRANT USAGE ON SCHEMA public TO ${role}`,
    `REVOKE CREATE ON SCHEMA public FROM ${role}`,
    `GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO ${role}`,
    `GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA public TO ${role}`,
    `ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO ${role}`,
    `ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT, UPDATE ON SEQUENCES TO ${role}`,
    `REVOKE ALL ON TABLE public."_prisma_migrations" FROM ${role}`,
  ];
}
