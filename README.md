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

Senhas do seed (apenas banco novo, desenvolvimento): `admin`/`admin123` e `caixa`/`caixa123`;
sobrescreva com `SEED_ADMIN_PASSWORD` e `SEED_CAIXA_PASSWORD`. O seed **só cria usuários se não existir
nenhum administrador**: depois de trocar login e senha (senha: `POST /users/:id/password`; login: SQL,
a API não altera `username`), rodar o seed de novo não recria os padrões.
O fuso do dia de negócio vem de `BUSINESS_TIMEZONE` (padrão `America/Sao_Paulo`).

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
| `GET /closings/today[?date=YYYY-MM-DD]` | logado | Fechamento de hoje ou da data escolhida. Dia sem lançamentos volta vazio (`id: 0`) e **não grava nada**: o fechamento é criado no 1º lançamento (com a diária vigente) ou ao fechar o dia. "Hoje" segue `BUSINESS_TIMEZONE` (padrão `America/Sao_Paulo`). Caixa só escolhe hoje e os 7 dias anteriores; admin, qualquer data |
| `POST /closings/today/close[?date=]` | logado | Fecha o dia (hoje ou a data escolhida) |
| `GET /closings/today/report[?date=]` | logado | Relatório de hoje ou da data: totais por pagamento, entregas, motoboy, gastos |
| `GET /orders/today[?date=]` | logado | Pedidos de hoje ou da data escolhida |
| `POST /orders[?date=]` | logado | `{amount, type: DELIVERY\|COUNTER, paymentMethodId, deliveryZoneId?, deliveryFee?}`; balcão não aceita bairro/taxa; entrega copia a taxa do bairro |
| `PUT /orders/:id`, `DELETE /orders/:id` | logado | Caixa só edita dentro da janela de datas e com o dia aberto |
| `GET /expenses/today[?date=]` | logado | Gastos de hoje ou da data escolhida |
| `POST /expenses[?date=]`, `PUT /expenses/:id`, `DELETE /expenses/:id` | logado | `{expenseTypeId, amount, description?}` (tipo ativo obrigatório, `description` é observação opcional); mesma regra de acesso dos pedidos |
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
| `GET /motoboy-rates`, `POST /motoboy-rates` | admin | `{dayGroup: TUE_THU\|FRI_SUN, amount, effectiveFrom}` (cada mudança é uma linha do histórico; repetir grupo e data **corrige** o valor daquela linha; dias já criados mantêm a diária com que nasceram) |
| `GET /users`, `POST /users` | admin | `{name, username, password, role: CAIXA\|ADMIN}` |
| `PUT /users/:id` | admin | `{name, role, active}`; desativar derruba as sessões; admin não se desativa |
| `POST /users/:id/password` | admin | `{newPassword}` |

## Frontend

React + Vite + TypeScript em `frontend/`, pensado primeiro para computador; algumas telas irão para o
celular mais adiante (ex.: estoque, Sprint 2). Em desenvolvimento o Vite repassa `/api/*` ao backend
(`BACKEND_URL`, padrão `http://localhost:3000`), então não há CORS.

Telas: `/login` e `/caixa` (caixa do dia com abas Pedidos, Gastos e Relatório e fechamento do dia).
Bairro e tipo de gasto novos são cadastrados ao digitar o nome no formulário.

```bash
cd frontend
npm ci --no-audit --no-fund
npm run dev      # http://localhost:5173 (com o backend rodando)
npm test         # Vitest + Testing Library
npm run build
```

## Produção

Um servidor só, com Docker: Postgres, migrations automáticas, backend e nginx (serve o front e repassa `/api`).

```bash
cp .env.prod.example .env            # edite: POSTGRES_PASSWORD, SEED_*_PASSWORD, WEB_PORT
docker compose -f docker-compose.prod.yml up -d --build
# só na 1ª vez (cria usuários, pagamentos, bairros e diárias; exige SEED_*_PASSWORD com 8+ caracteres):
docker compose -f docker-compose.prod.yml run --rm migrate npx prisma db seed
```

- O sistema fica em `http://<ip-do-servidor>:<WEB_PORT>/`. Só o nginx publica porta; banco e backend ficam na rede interna.
- Atualizar: `git pull` e o mesmo `up -d --build` (as migrations rodam sozinhas). **Não** rode o seed de novo em rotina: ele recria itens de cadastro que o admin tenha renomeado.
- O dia de negócio vira à meia-noite em `BUSINESS_TIMEZONE` (padrão `America/Sao_Paulo`), não no fuso do servidor.
- Backup: `docker compose -f docker-compose.prod.yml exec db pg_dump -U portallanches portallanches > backup.sql`.
- Limites conhecidos: as sessões ficam na memória (reiniciar o backend desloga todos; duram 12h); o nginx serve **HTTP** (senha trafega sem criptografia na rede local). Para HTTPS, ponha na frente um proxy com certificado (ex.: Caddy ou um túnel) apontando para o `web`.

## Importar a planilha histórica (ticket-medio-2026)

Comando de linha (`backend/`, Node via Docker como no resto do projeto). **Sem `--apply` é só simulação** e nada é gravado:

```bash
npm run import:ticket-medio -- ../docs/dataset-portallanches/ticket-medio-2026.xlsx --corrections ../docs/dataset-portallanches/corrections.json
# conferido o resumo por mês, grave (banco = DATABASE_URL; em produção, o do compose de produção):
npm run import:ticket-medio -- <mesmos argumentos> --apply
```

- Abas `<Mês>` (linha 1 = data, demais = valores dos pedidos) e `Gastos-<Mês>` (linha 1 = data, **linha 2 = motoboy**, demais = outros gastos). Pedidos e gastos são casados pela **data do cabeçalho**. Abas `logout`, `Fechamento-Ano` e `Login` são ignoradas.
- Pedidos entram com `type`, `payment_method_id` e `delivery_fee` **nulos** (a planilha não distingue balcão/entrega, pagamento nem taxa). Motoboy vira gasto do tipo "Motoboy", os demais do tipo "Importado (sem categoria)", e a diária do fechamento fica 0 (evita contar o motoboy duas vezes).
- Cada dia entra `CLOSED`, autor = 1º admin ativo, `closed_at` = fim do dia, `notes` = origem.
- Tudo ou nada (uma transação). **Qualquer erro bloqueia**: cabeçalho que não é data, data fora do mês, valor inválido, ou dia que já tem fechamento no banco (nunca sobrescreve). Avisos (célula `-`, zero, dia sem gastos/só com gastos) não bloqueiam.
- Corrija erros no `corrections.json` (a pasta `docs/dataset-portallanches/` não é versionada): `{ "Aba!Coluna": "YYYY-MM-DD" | "skip" }` para cabeçalho, `{ "Aba!ColunaLinha": 127.2 | "skip" }` para uma célula.

### Rodar em produção (compose)

O serviço `migrate` usa a imagem com o código-fonte e o `tsx`, e já enxerga o banco (`DATABASE_URL` do compose). Rode na pasta do repositório, no servidor:

```bash
# 1. Backup antes de qualquer coisa
docker compose -f docker-compose.prod.yml exec db pg_dump -U portallanches portallanches > backup-antes-importacao.sql
# 2. Sobe a versão nova (aplica a migration que torna type/payment/fee nulos e reconstrói a imagem do importador)
docker compose -f docker-compose.prod.yml up -d --build
# 3. Simulação: mostra erros, avisos e o resumo por mês; não grava
docker compose -f docker-compose.prod.yml run --rm -v "$PWD/docs/dataset-portallanches:/data:ro" migrate \
  npx tsx prisma/import-ticket-medio.ts /data/ticket-medio-2026.xlsx --corrections /data/corrections.json
# 4. Sem erros e com o resumo conferido: grave (repita o comando com --apply no fim)
```

- A planilha e o `corrections.json` precisam estar em `docs/dataset-portallanches/` **no servidor** (a pasta não vai para o git; copie por `scp`).
- Para desfazer: restaure o `backup-antes-importacao.sql` (ou apague os fechamentos com `notes = 'Importado da planilha ticket-medio-2026'`, com seus pedidos e gastos).
- Este procedimento de produção **ainda não foi executado** de ponta a ponta; a importação foi testada no banco de dev e em um banco descartável.

## Documentação do projeto

- Regras de desenvolvimento com Claude: [`CLAUDE.md`](./CLAUDE.md)
- Modelo de dados do Sprint 1: [`docs/banco-de-dados.md`](./docs/banco-de-dados.md)
- Requisitos do MVP e visão funcional: [`docs/mvp-pdv-requisitos.md`](./docs/mvp-pdv-requisitos.md)
- Planejamento por entregáveis (sprints): [`docs/mvp-pdv-sprints.md`](./docs/mvp-pdv-sprints.md)
