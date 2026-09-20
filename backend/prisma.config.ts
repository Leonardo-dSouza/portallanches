import { defineConfig } from 'prisma/config';

// A URL vem do ambiente (.env, ignorado pelo git); ver .env.example.
const databaseUrl: string =
  process.env.DATABASE_URL ??
  'postgresql://postgres:postgres@localhost:5432/portallanches';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations', seed: 'tsx prisma/seed.ts' },
  datasource: { url: databaseUrl },
});
