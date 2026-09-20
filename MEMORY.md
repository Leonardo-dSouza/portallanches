# AI Memory & Context Handoff

Última atualização: 2026-09-20 (fim da 1ª sessão).

## Status Atual
- Sprint 1 (fechamento de caixa diário): **backend completo e verificado**.
- Módulos: autenticação, fechamento diário, pedidos, gastos, relatório, cadastros de admin (pagamentos, bairros, diária), usuários.
- Tudo commitado (commits do backend até `4c3d9fa`; `frontend/` no commit seguinte). `.claude/` está no `.gitignore` por decisão do usuário.
- Frontend: **React + Vite + TypeScript** (decisão do usuário), desktop primeiro; poucas telas no celular mais adiante (ex.: estoque da Sprint 2). Base pronta: cliente HTTP, autenticação, login, rota protegida, shell.

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
- `npm test` (Vitest): Backend: 146 passaram (24 arquivos), e2e 1 passou. Frontend: 9 passaram (2 arquivos). Lint e build ok nos dois. `npm run lint`: 0 avisos/erros. `npm run build`: ok.
- Smoke test manual com curl no Postgres real para cada módulo (dados de teste apagados depois).
- **Não existe teste automatizado contra banco real** (só fakes); o e2e do Nest só cobre `GET /`.

## Como rodar (esta máquina não tem Node)
Node roda via Docker `node:24` (Node 22 quebra o `npm ci` por causa do lockfile):
`docker run --rm --network host -u $(id -u):$(id -g) -e HOME=/tmp -v $PWD:/app -w /app node:24 <cmd>`
dentro de `backend/`. Postgres: `docker compose up -d db`. Detalhes no `README.md`.

## Próximos Passos / Pendências
1. Abrir a demo no navegador e registrar ajustes visuais (o visual nunca foi conferido).
2. Trocar as senhas padrão do seed no servidor real (`SEED_ADMIN_PASSWORD`, `SEED_CAIXA_PASSWORD`) ou
   pela API (`POST /users/me/password`).
3. Decidir se o admin precisa criar fechamento de data passada (hoje só o dia atual é criado).
4. Frontend, próximas telas: caixa do dia (pedidos, gastos, relatório, fechar o dia), depois admin (histórico/reabrir, cadastros, usuários). Ver o que já existe em `README.md` (tabela de rotas).
5. Opcional: teste de integração contra Postgres; limite de tentativas de login (hoje não há).
