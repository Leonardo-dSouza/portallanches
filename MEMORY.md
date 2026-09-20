# AI Memory & Context Handoff

Última atualização: 2026-09-20 (fim da 2ª sessão).

## Status Atual
- Sprint 1 (fechamento de caixa diário): **backend completo e verificado**.
- Módulos: autenticação, fechamento diário, pedidos, gastos, relatório, cadastros de admin (pagamentos, bairros, diária), usuários.
- Tudo commitado (commits do backend até `4c3d9fa`; `frontend/` no commit seguinte). `.claude/` está no `.gitignore` por decisão do usuário.
- Frontend: **React + Vite + TypeScript** (decisão do usuário), desktop primeiro; poucas telas no celular mais adiante (ex.: estoque da Sprint 2). Base pronta: cliente HTTP, autenticação, login, rota protegida, shell.

## Sessão 2: Entrega 1 do plano (backend novo) — **feita, NÃO commitada**
Decisões do usuário (após `/grill-me`): caixa lança pedidos em lote no fim do expediente (atende 18h–23h, fecha ~23:30);
só 1 caixa hoje (sem polling, botão "Atualizar" basta); apagar sem confirmação nesta sprint; dinheiro no front aceita
só dígitos + vírgula/ponto, até 2 casas, sem somar no cliente (totais vêm do `/report`); gastos parametrizáveis;
bairro criado na hora pelo caixa; histórico (dia/semana/mês/ano) só para admin; admin pode fechar dia passado.
Plano de entregas: **1) backend (feito)** → 2) tela `/caixa` com abas Pedidos/Gastos/Relatório (formulário fixo ao lado
da lista, foco volta ao valor) → 3) histórico + cadastros do admin. Testes do front: `ApiClient` fake, sem navegador
(o usuário confere o visual na demo).
O que mudou no backend (arquivos modificados/novos ainda sem commit):
- **Tipos de gasto:** tabela `expense_types` (`name`, `nameKey` único, `active`), migration `20260920233000_expense_types`
  (apaga gastos antigos: só havia dados de dev). `Expense` agora tem `expenseTypeId` obrigatório e `description` opcional
  (observação). Rotas: `GET/POST /expense-types` (logado; caixa cria na hora, nasce ativo, duplicado → 409) e
  `PUT /expense-types/:id` (admin). Gasto com tipo inexistente → 404, inativo → 422. Seed cria "Compra no Atacadão", "Gás", "Freelancers".
- **Bairro pelo caixa:** `POST /delivery-zones` agora é aberto a qualquer logado (`{neighborhood, fee}`, sempre ativo);
  `PUT` continua só admin. Taxa digitada diferente da padrão vale só para o pedido (já era assim); só o admin muda o padrão.
- **Fechar dia passado:** `POST /closings/:date/close` (admin; o fechamento precisa existir, senão 404; nada é criado para datas passadas).
- **Relatório de período:** `GET /reports?from=&to=` (admin; inclusivo, máx. 366 dias, `days[]` + `totals`), 3 consultas em lote.
  Ainda **não** há totais de gastos por tipo (possível melhoria).
- Detalhe que mordeu: métodos de service que validam entrada precisam ser `async`, senão o erro sai síncrono e `rejects.toThrow` falha.
- Verificado com curl no Postgres real. Migration já aplicada no banco de dev; `pl-back` reiniciado com o build novo.
  Gasto de teste apagado; sobraram tipo "Embalagens" e bairro "Dunamis 8,00" (criados no smoke test, sem rota de apagar).

## Últimas Alterações (sessão 1)
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

## Servidores no ar (demo na rede local)
No fim da sessão o usuário pediu para expor o frontend na rede: **http://192.168.1.113:5173/** (login `caixa`/`caixa123`
ou `admin`/`admin123`). Rodam como containers Docker `--restart unless-stopped`, com bind mount do código:
- `pl-front`: `npx vite --host 0.0.0.0 --port 5173` (dev server; proxy `/api` → `localhost:3000`).
- `pl-back`: `node dist/main.js` (usa o `dist/` **já compilado**: depois de mudar o backend, rode `npm run build`
  em `backend/` e `docker restart pl-back`). Escuta em 3000 em todas as interfaces (sessões em memória: reiniciar desloga).
- Postgres: `portallanches-db-1` (`docker compose up -d db`).
- Para parar tudo: `docker rm -f pl-front pl-back`. O IP pode mudar (DHCP); conferir com `hostname -I`.
- Sem autenticação além do login e sem HTTPS: é só para demonstração em rede confiável. Firewall do host não foi verificado
  para outros aparelhos (só testei pelo próprio IP da máquina).

## Frontend (`frontend/`)
- `src/api/api-client.ts`: interface `ApiClient` (fake nos testes) + `createHttpApiClient` (fetch, Bearer, `ApiError`).
  Base `/api`; o Vite faz proxy para o backend removendo o prefixo (sem CORS). Produção ainda não decidida
  (servir o build por nginx/Nest com o mesmo prefixo).
- `src/auth/`: `AuthProvider` + `useAuth`, token em `localStorage` via interface `TokenStorage`.
- `src/pages/`: `LoginPage` (+ `LoginForm`, `LoginFields`, `use-login-form`), `HomePage` provisória.
- `src/components/`: `RequireAuth`, `AppShell`, `TextField`. CSS simples com variáveis (claro/escuro).
- Regras que morderam: `erasableSyntaxOnly` do Vite proíbe parameter properties (`constructor(private x)`);
  fakes de `Response` não podem ser reutilizados (corpo só lê uma vez); Prettier expande o JSX, então
  componentes precisam ser pequenos para caber em 20 linhas.
- Comandos (Node via Docker `node:24`, dentro de `frontend/`): `npm test`, `npm run lint`, `npm run build`.
- **Não foi verificado visualmente em navegador** (só testes + build + chamada real pelo proxy).

## Testes
- `npm test` (Vitest): Backend: 171 passaram (26 arquivos), e2e 1 passou (não reexecutado na sessão 2). Frontend: 9 passaram (2 arquivos). Lint e build ok nos dois. `npm run lint`: 0 avisos/erros. `npm run build`: ok.
- Smoke test manual com curl no Postgres real para cada módulo (dados de teste apagados depois).
- **Não existe teste automatizado contra banco real** (só fakes); o e2e do Nest só cobre `GET /`.

## Como rodar (esta máquina não tem Node)
Node roda via Docker `node:24` (Node 22 quebra o `npm ci` por causa do lockfile):
`docker run --rm --network host -u $(id -u):$(id -g) -e HOME=/tmp -v $PWD:/app -w /app node:24 <cmd>`
dentro de `backend/`. Postgres: `docker compose up -d db`. Detalhes no `README.md`.

## Próximos Passos / Pendências
1. Revisar e **commitar** a Entrega 1 (sem commit ainda; sugestão: commits separados por assunto).
2. **Entrega 2:** frontend `/caixa` (abas Pedidos, Gastos, Relatório; botão fechar o dia). Precisa de tipos em `src/api/types.ts`,
   métodos no `ApiClient` (pedidos, gastos, tipos, bairros, formas de pagamento, fechamento, relatório) e parser de dinheiro (vírgula → ponto).
   Ainda a decidir: no formulário de entrega, como o caixa cria o bairro novo (bairro + taxa) sem sair da tela.
3. **Entrega 3:** histórico do admin (dia/semana/mês/ano via `/reports`), fechar/reabrir dia, cadastros (tipos de gasto, bairros, formas de pagamento, diária, usuários).
4. Abrir a demo no navegador e registrar ajustes visuais (o visual nunca foi conferido).
5. Trocar as senhas padrão do seed no servidor real (`SEED_ADMIN_PASSWORD`, `SEED_CAIXA_PASSWORD`) ou pela API.
6. Opcional: teste de integração contra Postgres; limite de tentativas de login; totais de gastos por tipo no relatório.
