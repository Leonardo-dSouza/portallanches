# PortalLanches

Sistema PDV para uma lanchonete, com evolução por entregáveis (sprints) até operação em tempo real.

## Stack definida (backend)

- NestJS
- PostgreSQL
- Prisma 7.10
- Frontend: React + Vite + TypeScript

## Como rodar em desenvolvimento (compose)

```bash
docker compose up -d             # banco (15433), API (13000) e front (http://localhost:15173)
docker compose logs -f backend   # acompanhar a API
docker compose exec backend npx prisma db seed   # só em banco novo
docker compose down              # para tudo (os dados do banco ficam no volume)
```

API e front rodam do código montado com recarga automática (Nest em watch e Vite): salvar o arquivo basta.
Na subida, a API instala as dependências se faltar `node_modules`, gera o client do Prisma e aplica as
migrations pendentes. Os contêineres usam o usuário 1000:1001; outro usuário no host: `DEV_UID`/`DEV_GID`.

## Como rodar o backend sem compose

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
| `GET /closings/today/report[?date=]` | logado | Relatório de hoje ou da data: faturamento (`revenue`: pedidos pagos na hora + recebido de fiado com o adicional), o que entrou por forma, fiados vendidos e recebidos na noite, entregas, motoboy, gastos |
| `GET /orders/today[?date=]` | logado | Pedidos de hoje ou da data escolhida |
| `GET /orders/:id` | logado | Um pedido com os itens (sem custo) e o bloco `fiado`. O caixa abre os das noites que ele vê e os fiados de qualquer noite (aba Fiado); o histórico (`/orders/:id/events`) segue a mesma regra |
| `POST /orders[?date=]` | logado | `{amount, type: DELIVERY\|COUNTER, paymentMethodId, customerId?, deliveryFee?}`; balcão não aceita cliente/taxa; entrega exige `customerId`, usa o bairro do cliente e copia a taxa do bairro e nome/telefone/rua do cliente |
| `POST /orders` com fiado | logado | Forma marcada `isFiado`: exige `customerId` (no balcão copia só nome e telefone, sem bairro e taxa 0) e aceita `fiadoDueDate?` (YYYY-MM-DD, não antes da noite do pedido). O pedido traz `fiado: {dueDate, paidTotal, remaining, customerOpenTotal}` (null fora do fiado). Com recebimento ativo, editar e cancelar → 409 (estorne antes) |
| `PUT /orders/:id`, `DELETE /orders/:id` | logado | Caixa só edita dentro da janela de datas e com o dia aberto |
| `GET /expenses/today[?date=]` | logado | Gastos de hoje ou da data escolhida |
| `POST /expenses[?date=]`, `PUT /expenses/:id`, `DELETE /expenses/:id` | logado | `{expenseTypeId, amount, description?}` (tipo ativo obrigatório, `description` é observação opcional); mesma regra de acesso dos pedidos |
| `GET /payment-methods`, `GET /delivery-zones`, `GET /expense-types` | logado | Listas para o lançamento de pedidos e gastos |
| `GET /customers?phone=` | logado | Cliente do telefone (qualquer formato; lista com 0 ou 1) |
| `GET /customers/streets[?deliveryZoneId=]` | logado | Ruas distintas já cadastradas (do bairro, se informado), em ordem alfabética: sugestões do campo Rua |
| `POST /customers`, `PUT /customers/:id` | logado | `{name, phone?, street?, number?, reference?, deliveryZoneId?}`: o caixa cadastra ou atualiza na hora; endereço é tudo ou nada (rua + número + bairro juntos; o cliente do balcão/fiado é só nome e telefone); telefone só dígitos (8 a 13) e único → 409 se repetido |
| `GET /fiado/open` | logado | Quem deve no fiado: cliente, telefone, total em aberto e os pedidos (noite, #, valor, pago, falta, previsão) |
| `GET /fiado/settled` | logado | Quem quitou tudo: cliente, telefone, pedidos, total e a última noite paga, o pagamento mais recente primeiro. O extrato (`/fiado/customers/:id`) segue aberto para ver e estornar |
| `GET /fiado/due[?date=]` | logado | Fiados de outras noites a cobrar nesta: falta > 0 e previsão até a data (o atrasado aparece toda noite) |
| `GET /fiado/customers/:id` | logado | Extrato: pedidos em aberto, pagos e os recebimentos (os estornados também) |
| `POST /fiado/orders/:id/payments` | logado | `{amount, extra?, paymentMethodId, paymentMode?, date?}`: de 0,01 até o que falta; a forma não pode ser a fiado; entra no faturamento e na forma da noite do pagamento, com o adicional (mesma regra de datas do pedido), e não mexe no estoque. Responde com `remaining` e `customerOpenTotal` |
| `POST /fiado/payments/:id/cancel` | logado | Estorno `{reason, managerPassword?}`: a trava do cancelar (minutos de Cadastros → Caixa, depois a senha do admin), só com a noite do pagamento aberta |
| `PUT /fiado/orders/:id/due-date` | logado | Remarca a previsão `{dueDate: YYYY-MM-DD \| null}` (sem senha) |
| `GET /stock` | logado | Situação de cada insumo ativo: saldo, lotes (ordem de validade), próxima validade, última contagem e alertas `{expired, expiringSoon (≤ 7 dias), belowMin, needsPurchase}` na data de negócio |
| `POST /stock/entries` | logado | `{supplyId, amount, packageName?, expiresOn?}`: cria um lote; em embalagem, converte para a unidade de contagem (2 fardos → 12 un) |
| `POST /stock/counts` | logado | `{items: [{supplyId, status: COUNTED\|NOT_COUNTED\|NEEDS_PURCHASE, quantity?}]}` → 204. Contagem por sobrescrita: a diferença a menos sai dos lotes que vencem primeiro; a mais vira lote sem validade. Tudo numa transação |
| `GET /supplies` | logado | Insumos do estoque com as embalagens |
| `GET /product-categories` | logado | Categorias do cardápio (Tradicional, Artesanal, Adicionais), na ordem de `sortOrder` |
| `GET /products` | logado | Lanches com a composição (insumo, unidade, custo atual, quantidade), `cmv`, `cmvComplete` (false se algum insumo está sem custo) e `cmvPercent` (CMV ÷ preço) |
| `POST /delivery-zones` | logado | `{neighborhood, fee}`: o caixa cadastra o bairro na hora (nasce ativo); bairro repetido → 409 |
| `POST /expense-types` | logado | `{name}`: o caixa cria um tipo de gasto na hora (nasce ativo); nome repetido → 409 |
| `POST /users/me/password` | logado | `{currentPassword, newPassword}`; encerra as sessões do usuário |
| `GET /closings`, `GET /closings/:date` | admin | Histórico de fechamentos |
| `POST /closings/:date/close` | admin | Fecha um dia que ficou aberto (o fechamento precisa existir; 404 se não) |
| `POST /closings/:date/reopen` | admin | Reabre um fechamento fechado |
| `GET /reports?from=&to=` | admin | Relatório somado do período (`YYYY-MM-DD`, inclusivo, máx. 366 dias): `days` (um por dia com fechamento) e `totals` |
| `GET /closings/:date/orders`, `/expenses`, `/report` | admin | Dados de qualquer dia |
| `POST /payment-methods`, `PUT /payment-methods/:id` | admin | `{name, active, sortOrder, isCardTerminal, isCash, isFiado}` (nada é apagado: use `active: false`); fiado não pode ser dinheiro nem maquininha |
| `POST /supplies`, `PUT /supplies/:id` | admin | `{name, countUnit, minStock?, unitCost?, deductOnSale?, active?, packages: [{name, quantity}]}`; quantidades com até 3 casas, custo por unidade de contagem com até 4; `deductOnSale` padrão true; o PUT troca a lista inteira de embalagens; nome repetido → 409 |
| `POST /products`, `PUT /products/:id` | admin | `{categoryId, menuNumber?, name, description?, salePrice?, active?, components: [{supplyId, quantity}]}`; quantidade na unidade de contagem do insumo (até 3 casas); o PUT troca a composição inteira; nome repetido na categoria → 409; categoria ou insumo inexistente → 422 |
| `PUT /product-categories/:id/choice-category` | admin | `{choiceCategoryId \| null}`: escolha obrigatória dos itens da categoria (o pão do artesanal: Artesanal → Pão). Cada item dela sai com `choiceProductId` de 1 produto da categoria apontada, gravado como linha filha `isChoice` (preço, CMV e baixa pela composição dele); a linha gravada antes, sem escolha, passa na edição enquanto não muda |
| `GET /product-categories/:id/product-order`, `PUT /product-categories/:id/product-order` | admin | `{ids}` com todos os produtos da categoria: a ordem vira a tecla 1, 2, 3 da escolha no caixa |
| `PUT /delivery-zones/:id` | admin | `{neighborhood, fee, active}` (só o admin muda o padrão ou desativa) |
| `PUT /expense-types/:id` | admin | `{name, active}` |
| `GET /motoboy-rates`, `POST /motoboy-rates` | admin | `{dayGroup: TUE_THU\|FRI_SUN, amount, effectiveFrom}` (cada mudança é uma linha do histórico; repetir grupo e data **corrige** o valor daquela linha; dias já criados mantêm a diária com que nasceram) |
| `GET /users`, `POST /users` | admin | `{name, username, password, role: CAIXA\|ADMIN}` |
| `PUT /users/:id` | admin | `{name, role, active}`; desativar derruba as sessões; admin não se desativa |
| `POST /users/:id/password` | admin | `{newPassword}` |

## Frontend

React + Vite + TypeScript em `frontend/`, pensado primeiro para computador; algumas telas irão para o
celular mais adiante (ex.: estoque, Sprint 2). Em desenvolvimento o Vite repassa `/api/*` ao backend
(`BACKEND_URL`, padrão `http://localhost:13000`), então não há CORS.

Telas: `/login` e `/caixa` (caixa do dia com abas Pedidos, Gastos e Relatório e fechamento do dia).
Bairro e tipo de gasto novos são cadastrados ao digitar o nome no formulário.

```bash
cd frontend
npm ci --no-audit --no-fund
npm run dev      # http://localhost:15173 (com o backend rodando)
npm test         # Vitest + Testing Library
npm run build
```

## Produção

Um servidor só, com Docker: Postgres, migrations automáticas, backend e nginx (serve o front e repassa `/api`).
O servidor de hoje é um notebook antigo; montagem, cuidados e operação ficam na documentação interna (fora do git).

- **Deploy pelo GitHub** (`.github/workflows/ci-cd.yml`): todo push testa; na `main` as imagens são montadas e
  publicadas no GHCR (`ghcr.io/leonardo-dsouza/portallanches-{migrate,backend,web}`), e o deploy espera a aprovação
  no environment `production`. Quem roda o deploy é um runner self-hosted no próprio servidor, com
  `deploy/deploy-prod.sh <commit>`, que também serve para o rollback.
- **O servidor nunca monta imagem:** o `docker-compose.prod.yml` não tem `build:` e usa a tag local `deployed`
  com `pull_policy: never`.
- Só na 1ª vez (cria usuários, pagamentos, bairros e diárias; exige `SEED_*_PASSWORD` com 8+ caracteres):
  `docker compose --env-file .env.prod -f docker-compose.prod.yml run --rm migrate npx prisma db seed`.
- O sistema fica em `http://<ip-do-servidor>:<WEB_PORT>/` (padrão **18480**). Só o nginx publica porta na rede; o banco fica em `127.0.0.1:<DB_PORT>` (padrão **15480**, só na própria máquina) e o backend na rede interna.
- O projeto se chama `portallanches-prod` (campo `name` do compose): não colide com a pilha de dev na mesma máquina e dispensa o `-p`.
- As migrations rodam sozinhas em cada deploy. **Não** rode o seed de novo em rotina: ele recria itens de cadastro que o admin tenha renomeado.
- O dia de negócio vira à meia-noite em `BUSINESS_TIMEZONE` (padrão `America/Sao_Paulo`), não no fuso do servidor.
- Backup: `deploy/backup-prod.sh` no PC puxa um dump da produção; o deploy faz outro no servidor antes de cada subida.
- Limites conhecidos: as sessões ficam na memória (reiniciar o backend desloga todos; duram 12h); o nginx serve **HTTP** (senha trafega sem criptografia na rede local). Para HTTPS, ponha na frente um proxy com certificado (ex.: Caddy ou um túnel) apontando para o `web`.

### Servidor de produção (rede local)

Desde 2026-10-06 a produção roda num notebook dedicado na rede local da lanchonete, ao lado do PC de dev.
Nunca monte imagem nele: o deploy é pelo GitHub (seção [Produção](#produção)). Endereço, montagem e operação ficam
na documentação interna (fora do git).
Portas: web **18480**, banco **15480** (só `127.0.0.1`); dev em 15173 (front), 13000 (API) e 15433 (banco).

## Documentação do projeto

- Regras de desenvolvimento com Claude: [`CLAUDE.md`](./CLAUDE.md)
- A documentação interna (servidor de produção, modelo de dados, requisitos, sprints e planos, na pasta `docs/`) e o
  handoff entre sessões (`MEMORY.md`) ficam **fora do git**, só na máquina de desenvolvimento: o repositório é público
  e eles descrevem a rede local da lanchonete.
