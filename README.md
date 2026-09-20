# PortalLanches

Sistema PDV para uma lanchonete, com evolução por entregáveis (sprints) até operação em tempo real.

## Stack definida (backend)

- NestJS
- PostgreSQL
- Prisma 7.10

## Como rodar o backend

```bash
docker compose up -d db          # Postgres local
cd backend
cp .env.example .env
npm ci --no-audit --no-fund
npx prisma generate
npx prisma migrate dev           # aplica as migrations
npx prisma db seed               # usuários admin/caixa, pagamentos, bairros, diárias
npm run start:dev
```

Senhas do seed (apenas desenvolvimento): `admin`/`admin123` e `caixa`/`caixa123`;
sobrescreva com `SEED_ADMIN_PASSWORD` e `SEED_CAIXA_PASSWORD`.

## Frontend

Ainda em decisão. Prioridade para uma opção com boa compatibilidade com fluxo de desenvolvimento assistido por IA.

## Documentação do projeto

- Regras de desenvolvimento com Claude: [`CLAUDE.md`](./CLAUDE.md)
- Modelo de dados do Sprint 1: [`docs/banco-de-dados.md`](./docs/banco-de-dados.md)
- Requisitos do MVP e visão funcional: [`docs/mvp-pdv-requisitos.md`](./docs/mvp-pdv-requisitos.md)
- Planejamento por entregáveis (sprints): [`docs/mvp-pdv-sprints.md`](./docs/mvp-pdv-sprints.md)
