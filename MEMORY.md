# AI Memory & Context Handoff

Última atualização: 2026-09-20 (sessão 3: redesign visual do frontend em 4 passadas, sem commit).

## Status Atual
- Sprint 1 (fechamento de caixa diário): **backend completo e verificado**.
- Módulos: autenticação, fechamento diário, pedidos, gastos, relatório, cadastros de admin (pagamentos, bairros, diária), usuários.
- Tudo commitado (commits do backend até `4c3d9fa`; `frontend/` no commit seguinte). `.claude/` está no `.gitignore` por decisão do usuário.
- Frontend: **React + Vite + TypeScript** (decisão do usuário), desktop primeiro; poucas telas no celular mais adiante (ex.: estoque da Sprint 2). Base pronta: cliente HTTP, autenticação, login, rota protegida, shell.

## Sessão 3: redesign visual do `/caixa` (feito, **ainda sem commit**)
O usuário achou o visual simples demais e pediu 4 passadas: 1) estrutura, 2) sistema de design (Tailwind, espaçamento,
tipografia, cores), 3) polimento (alinhamento, respiro, hierarquia), 4) UX (hover, carregando/vazio, transições).
- **Tailwind v4** (`tailwindcss` + `@tailwindcss/vite`, plugin em `vite.config.ts`) e fonte `@fontsource-variable/inter` (local, sem CDN).
  Tokens semânticos em `src/index.css` (`:root` claro/escuro em oklch, mapeados por `@theme inline`: `bg-surface`, `text-muted`,
  `bg-brand`...). Componentes em `src/styles/components.css` com `@apply` e os **mesmos nomes de classe de antes** (`card`, `button`,
  `field`, `table`, `tabs`...). Regra que mordeu: `@apply card` falha (classe de componente não é utility); liste o seletor junto.
- Estrutura nova: `AppShell` com nav; `CashHeader`, `CashTabs` (contagem `aria-hidden` para não mudar o nome da aba nos testes);
  `EmptyState` (ícone), `Skeleton` (carregando); relatório em 3 seções + painel "Fechamento"; tipo do pedido como controle segmentado;
  ações da linha como botões discretos (`button-ghost`); `aria-busy` nos botões de envio mostra spinner; painel de aba com `rise-in`;
  `prefers-reduced-motion` respeitado. Sem lógica/API alteradas; nenhum totalizador novo no cliente.
- Conferido visualmente (1366px) com Firefox headless + `puppeteer-core` via WebDriver BiDi e uma página de preview com `FakeApiClient`
  (temporária, removida). Não foi conferido: celular, tema escuro, tela de login e o formulário de Entrega/edição no navegador real.
- Frontend: 52 testes, lint 0, `tsc -b` e build ok. `pl-front` foi reiniciado para carregar o plugin do Tailwind.

## Sessão 2, Entrega 2: tela do caixa (`/caixa`) — feita e commitada
- Rota `/` redireciona para `/caixa` (`HomePage` removida). `CashierPage` = cabeçalho (data, status, Atualizar) + abas
  Pedidos / Gastos / Relatório. Dados do dia via `useCashDay` (uma carga com `Promise.all`; `reload` após cada gravação; sem polling).
- Formulário fixo ao lado da lista; depois de salvar mantém tipo e forma de pagamento e devolve o foco ao valor.
- **Bairro e tipo de gasto por digitação** (datalist): nome desconhecido é cadastrado na hora (`saveOrderRequest` / `saveExpenseRequest`
  criam o bairro/tipo antes). Bairro conhecido preenche a taxa padrão; taxa diferente vai como `deliveryFee` só naquele pedido.
- Dinheiro: `toApiMoney` (só dígitos + vírgula/ponto, ≤2 casas, sem somar no cliente), `formatMoney` para exibir.
- Dia `CLOSED`: abas mostram aviso e escondem formulário/ações (até para admin: reabrir será na Entrega 3).
- Fechar o dia pede confirmação em 2 passos (o caixa não reabre); apagar pedido/gasto NÃO pede confirmação (decisão do usuário).
- `ApiContext`/`useApi` injeta o `ApiClient`; `createCashApi(api)` tipa as chamadas. Testes usam `src/test-support/fake-api-client.ts`
  (API em memória, compartilhada com o teste de login). Regra que mordeu: lint do React barra ref dentro de objeto retornado por hook
  (o ref é criado no componente e passado como `focusRef`); setState direto em `useEffect` também é barrado.
- Frontend: 52 testes, lint 0, `tsc -b` e build ok. Continua **sem conferência visual em navegador** (o Vite da demo em :5173 já serve o código novo).

## Sessão 2, Entrega 1 (backend novo) — feita e commitada
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
- `npm test` (Vitest): Backend: 171 passaram (26 arquivos), e2e 1 passou (não reexecutado na sessão 2). Frontend: 52 passaram (8 arquivos). Lint e build ok nos dois. `npm run lint`: 0 avisos/erros. `npm run build`: ok.
- Smoke test manual com curl no Postgres real para cada módulo (dados de teste apagados depois).
- **Não existe teste automatizado contra banco real** (só fakes); o e2e do Nest só cobre `GET /`.

## Como rodar (esta máquina não tem Node)
Node roda via Docker `node:24` (Node 22 quebra o `npm ci` por causa do lockfile):
`docker run --rm --network host -u $(id -u):$(id -g) -e HOME=/tmp -v $PWD:/app -w /app node:24 <cmd>`
dentro de `backend/`. Postgres: `docker compose up -d db`. Detalhes no `README.md`.

## Próximos Passos / Pendências
1. Usuário conferir o novo visual do `/caixa` na demo (http://192.168.1.113:5173/), inclusive o dia atual, que está **fechado** no banco de dev (só o admin reabre), e commitar a sessão 3.
2. **Entrega 3:** histórico do admin (dia/semana/mês/ano via `/reports`), fechar/reabrir dia, cadastros (tipos de gasto, bairros, formas de pagamento, diária, usuários).
3. Trocar as senhas padrão do seed no servidor real (`SEED_ADMIN_PASSWORD`, `SEED_CAIXA_PASSWORD`) ou pela API.
4. Opcional: teste de integração contra Postgres; limite de tentativas de login; totais de gastos por tipo no relatório.
