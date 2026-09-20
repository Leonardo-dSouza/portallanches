# PortalLanches

Sistema PDV para uma lanchonete, com evolução por entregáveis (sprints) até operação em tempo real.

## Stack definida (backend)

- NestJS
- PostgreSQL
- Prisma 7.10
- Frontend: React + Vite + TypeScript

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

## API do backend

Toda rota exige `Authorization: Bearer <token>` (obtido em `POST /auth/login`), exceto as marcadas
como públicas. Valores monetários trafegam como número ou texto com até 2 casas (`25.5`, `"25.50"`)
e voltam como texto (`"25.50"`); datas são `YYYY-MM-DD`. Erros trazem o valor recebido e o formato esperado.

| Rota | Perfil | Descrição |
| --- | --- | --- |
| `GET /` | público | Health check |
| `POST /auth/login` | público | `{username, password}` → `{token, user}` (sessão de 12h) |
| `POST /auth/logout` | logado | Encerra a sessão |
| `GET /auth/me` | logado | Usuário logado |
| `GET /closings/today` | logado | Fechamento de hoje (criado no 1º acesso, com a diária vigente; segunda-feira recusada) |
| `POST /closings/today/close` | logado | Fecha o dia |
| `GET /closings/today/report` | logado | Relatório de hoje: totais por pagamento, entregas, motoboy, gastos |
| `GET /orders/today` | logado | Pedidos de hoje |
| `POST /orders` | logado | `{amount, type: DELIVERY\|COUNTER, paymentMethodId, deliveryZoneId?, deliveryFee?}`; balcão não aceita bairro/taxa; entrega copia a taxa do bairro |
| `PUT /orders/:id`, `DELETE /orders/:id` | logado | Caixa só edita hoje e com o dia aberto |
| `GET /expenses/today` | logado | Gastos de hoje |
| `POST /expenses`, `PUT /expenses/:id`, `DELETE /expenses/:id` | logado | `{expenseTypeId, amount, description?}` (tipo ativo obrigatório, `description` é observação opcional); mesma regra de acesso dos pedidos |
| `GET /payment-methods`, `GET /delivery-zones`, `GET /expense-types` | logado | Listas para o lançamento de pedidos e gastos |
| `POST /delivery-zones` | logado | `{neighborhood, fee}`: o caixa cadastra o bairro na hora (nasce ativo); bairro repetido → 409 |
| `POST /expense-types` | logado | `{name}`: o caixa cria um tipo de gasto na hora (nasce ativo); nome repetido → 409 |
| `POST /users/me/password` | logado | `{currentPassword, newPassword}`; encerra as sessões do usuário |
| `GET /closings`, `GET /closings/:date` | admin | Histórico de fechamentos |
| `POST /closings/:date/close` | admin | Fecha um dia que ficou aberto (o fechamento precisa existir; 404 se não) |
| `POST /closings/:date/reopen` | admin | Reabre um fechamento fechado |
| `GET /reports?from=&to=` | admin | Relatório somado do período (`YYYY-MM-DD`, inclusivo, máx. 366 dias): `days` (um por dia com fechamento) e `totals` |
| `GET /closings/:date/orders`, `/expenses`, `/report` | admin | Dados de qualquer dia |
| `POST /payment-methods`, `PUT /payment-methods/:id` | admin | `{name, active, sortOrder}` (nada é apagado: use `active: false`) |
| `PUT /delivery-zones/:id` | admin | `{neighborhood, fee, active}` (só o admin muda o padrão ou desativa) |
| `PUT /expense-types/:id` | admin | `{name, active}` |
| `GET /motoboy-rates`, `POST /motoboy-rates` | admin | `{dayGroup: TUE_THU\|FRI_SUN, amount, effectiveFrom}` (cada mudança é uma nova linha) |
| `GET /users`, `POST /users` | admin | `{name, username, password, role: CAIXA\|ADMIN}` |
| `PUT /users/:id` | admin | `{name, role, active}`; desativar derruba as sessões; admin não se desativa |
| `POST /users/:id/password` | admin | `{newPassword}` |

## Frontend

React + Vite + TypeScript em `frontend/`, pensado primeiro para computador; algumas telas irão para o
celular mais adiante (ex.: estoque, Sprint 2). Em desenvolvimento o Vite repassa `/api/*` ao backend
(`BACKEND_URL`, padrão `http://localhost:3000`), então não há CORS.

```bash
cd frontend
npm ci --no-audit --no-fund
npm run dev      # http://localhost:5173 (com o backend rodando)
npm test         # Vitest + Testing Library
npm run build
```

## Documentação do projeto

- Regras de desenvolvimento com Claude: [`CLAUDE.md`](./CLAUDE.md)
- Modelo de dados do Sprint 1: [`docs/banco-de-dados.md`](./docs/banco-de-dados.md)
- Requisitos do MVP e visão funcional: [`docs/mvp-pdv-requisitos.md`](./docs/mvp-pdv-requisitos.md)
- Planejamento por entregáveis (sprints): [`docs/mvp-pdv-sprints.md`](./docs/mvp-pdv-sprints.md)
