# AI Memory & Context Handoff

Última atualização: 2026-09-20.

## Status Atual
- Sprint 1 (fechamento de caixa diário): **backend completo e verificado**.
- Módulos: autenticação, fechamento diário, pedidos, gastos, relatório, cadastros de admin (pagamentos, bairros, diária), usuários.
- Último commit: `05c08e0`. **Sem commit:** cadastros/usuários/filtro de erros Prisma/README de rotas (ver abaixo). `.claude/` está no `.gitignore` por decisão do usuário.
- Frontend: próximo passo; stack ainda a definir com o usuário. Precisará habilitar CORS no backend (ou servir o build pelo Nest).

## Últimas Alterações (esta sessão)
Commits: `83a04f8` (migration/seed/PrismaService), `a111b22` (auth), `d04ee24` (fechamento),
`b5963d5` (pedidos), `938717c` (gastos), `7af54c0` (relatório, `MEMORY.md`, `CLAUDE.md`, gitignore).

- **Auth:** sessão em memória (12h), token Bearer, `AuthGuard` global, `@Public()`, `@Roles('ADMIN')`,
  `@CurrentUser()`. Escopo pequeno de propósito (servidor próprio, até 2 caixas e 3 admins).
- **Fechamento:** `GET /closings/today` cria o dia no 1º acesso (diária copiada); `POST /closings/today/close`;
  admin: `GET /closings`, `GET /closings/:date`, `POST /closings/:date/reopen`. Segunda-feira recusada.
  "Hoje" = data local do servidor (decisão do usuário).
- **Pedidos:** `POST/PUT/DELETE /orders`, `GET /orders/today`, admin `GET /closings/:date/orders`.
  Balcão: sem bairro, taxa 0. Entrega: taxa do bairro copiada, sobrescrevível.
- **Gastos:** mesmas rotas em `/expenses`. Regra de acesso compartilhada em `closing/closing-access.ts`
  (caixa só hoje e com dia aberto; admin qualquer dia).
- **Relatório:** `GET /closings/today/report` (caixa e admin), `GET /closings/:date/report` (admin).
  Totais por forma de pagamento, entregas/taxas, custo do motoboy (diária + taxas), total de gastos.
  Somas em centavos inteiros.
- **Cadastros (admin):** `/payment-methods`, `/delivery-zones` (leitura liberada a qualquer logado), `/motoboy-rates`.
  Nada é apagado (`active: false`). **Usuários:** `/users` (CRUD parcial, sem delete), `POST /users/:id/password`,
  `POST /users/me/password`; desativar ou trocar senha derruba as sessões; admin não se desativa.
- **Filtro global** (`common/prisma-error.filter.ts`): P2002 → 409 e P2025 → 404. Com o driver adapter do Prisma 7
  o alvo do erro vem em `meta.driverAdapterError.cause.constraint`, não em `meta.target`.
- Rotas documentadas no `README.md`. Parsers de entrada compartilhados em `common/input-parsers.ts`.
- Infra: `docker-compose.yml` (Postgres 17), migration `init` com as 2 CHECK, seed idempotente.

## Testes
- `npm test` (Vitest): 146 passaram (24 arquivos), 0 falharam; e2e: 1 passou. `npm run lint`: 0 avisos/erros. `npm run build`: ok.
- Smoke test manual com curl no Postgres real para cada módulo (dados de teste apagados depois).
- **Não existe teste automatizado contra banco real** (só fakes); o e2e do Nest só cobre `GET /`.

## Como rodar (esta máquina não tem Node)
Node roda via Docker `node:24` (Node 22 quebra o `npm ci` por causa do lockfile):
`docker run --rm --network host -u $(id -u):$(id -g) -e HOME=/tmp -v $PWD:/app -w /app node:24 <cmd>`
dentro de `backend/`. Postgres: `docker compose up -d db`. Detalhes no `README.md`.

## Próximos Passos / Pendências
1. Commitar o trabalho pendente (cadastros, usuários, filtro de erros, README de rotas).
2. Trocar as senhas padrão do seed no servidor real (`SEED_ADMIN_PASSWORD`, `SEED_CAIXA_PASSWORD`) ou
   pela API (`POST /users/me/password`).
3. Decidir se o admin precisa criar fechamento de data passada (hoje só o dia atual é criado).
4. Frontend: definir a stack e começar (telas: login, caixa do dia com pedidos/gastos/relatório, admin).
5. Opcional: teste de integração contra Postgres; limite de tentativas de login (hoje não há).
