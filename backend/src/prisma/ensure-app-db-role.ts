import pg from 'pg';
import {
  APP_DB_ROLE,
  appDbRoleStatements,
  parseAppDbPassword,
} from './app-db-role.js';

/**
 * Roda no serviço `migrate` da produção, depois do `prisma migrate deploy`, com o dono do banco
 * (DATABASE_URL): cria ou acerta o usuário que o backend usa e as permissões dele.
 * Uso: node dist/prisma/ensure-app-db-role.js
 */
async function ensureAppDbRole(): Promise<void> {
  const password = parseAppDbPassword(process.env.APP_DB_PASSWORD);
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    const { rows } = await client.query<{ name: string }>(
      'SELECT current_database() AS name',
    );
    for (const sql of appDbRoleStatements(password, rows[0].name))
      await client.query(sql);
  } finally {
    await client.end();
  }
  console.log(
    JSON.stringify({ event: 'app_db_role_ready', role: APP_DB_ROLE }),
  );
}

await ensureAppDbRole();
