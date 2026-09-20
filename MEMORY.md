# AI Memory & Context Handoff

Última atualização: 2026-09-20.

## Status Atual
- Sprint 1 (fechamento de caixa diário): **backend completo**, faltando só fechar pendências abaixo.
- Módulos prontos e testados: autenticação, fechamento diário, pedidos, gastos, relatório.
- O módulo de relatório (`backend/src/report/`) está **sem commit** (aguardando o usuário autorizar).
- Frontend: ainda não decidido.

## Últimas Alterações (esta sessão)
Commits: `83a04f8` (migration/seed/PrismaService), `a111b22` (auth), `d04ee24` (fechamento),
`b5963d5` (pedidos), `938717c` (gastos). Sem commit: `backend/src/report/`, `common/money.ts`
(`toCents`/`formatCents`), `app.module.ts` (ReportModule) e este `MEMORY.md`, `.claude/`, `CLAUDE.md`.

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
- Infra: `docker-compose.yml` (Postgres 17), migration `init` com as 2 CHECK, seed idempotente.

## Testes
- `npm test` (Vitest): 106 passaram, 0 falharam. `npm run lint`: 0 avisos/erros. `npm run build`: ok.
- Smoke test manual com curl no Postgres real para cada módulo (dados de teste apagados depois).
- **Não existe teste automatizado contra banco real** (só fakes); o e2e do Nest só cobre `GET /`.

## Como rodar (esta máquina não tem Node)
Node roda via Docker `node:24` (Node 22 quebra o `npm ci` por causa do lockfile):
`docker run --rm --network host -u $(id -u):$(id -g) -e HOME=/tmp -v $PWD:/app -w /app node:24 <cmd>`
dentro de `backend/`. Postgres: `docker compose up -d db`. Detalhes no `README.md`.

## Próximos Passos / Pendências
1. Commitar o relatório (e decidir se `MEMORY.md`, `.claude/` e a mudança do `CLAUDE.md` entram no repo).
2. Atualizar o `README.md` com a lista de rotas da API (ainda só tem como rodar).
3. Trocar as senhas padrão do seed no servidor real (`SEED_ADMIN_PASSWORD`, `SEED_CAIXA_PASSWORD`);
   não existe endpoint de troca de senha nem de cadastro de usuários/formas de pagamento/bairros/diária.
4. Decidir se o admin precisa criar fechamento de data passada (hoje só o dia atual é criado).
5. Decidir o frontend (prioridade: boa compatibilidade com desenvolvimento assistido por IA).
6. Opcional: teste de integração contra Postgres; limite de tentativas de login (hoje não há).
