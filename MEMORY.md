# AI Memory & Context Handoff

Última atualização: 2026-09-25 (sessão 6, início: contexto recarregado, novo `/grill-me` do plano da planilha de custos antes de implementar; antes, sessão 5, fim: Entregável 2 commitado em 8 commits e plano da importação da planilha de custos aprovado; antes, 2026-09-23 sessão 5: banco de dev recriado e planilha reimportada para o usuário analisar; antes, sessão 4: importação da planilha histórica ticket-medio-2026, relatório com pedidos sem pagamento, total do período no topo do histórico; antes, sessão 3).

## Status Atual
- Sprint 1 (fechamento de caixa diário): **backend completo e verificado**.
- Módulos: autenticação, fechamento diário, pedidos, gastos, relatório, cadastros de admin (pagamentos, bairros, diária), usuários.
- Tudo commitado (commits do backend até `4c3d9fa`; `frontend/` no commit seguinte). `.claude/` está no `.gitignore` por decisão do usuário.
- Frontend: **React + Vite + TypeScript** (decisão do usuário), desktop primeiro; poucas telas no celular mais adiante (ex.: estoque da Sprint 2). Base pronta: cliente HTTP, autenticação, login, rota protegida, shell.

## Sessão 6 (em andamento): 4ª rodada de grill-me do plano da planilha de custos
- Contexto recarregado (`MEMORY.md` + `docs/plano-importacao-cardapio.md`). Nada implementado ainda.
- 4ª rodada de `/grill-me` respondida (detalhes em "Decisões da 4ª rodada" no plano): importação **recorrente** (a planilha é a v1 do cardápio); **a planilha sempre vence** na reimportação (a simulação mostra o antes e o depois, nada é apagado); adicionais como produto por enquanto; **açaí e coberturas fora** (`Produto_2` ignorada).
- **3.0a feita e commitada (`1c8ce1d`):** migration `20260926004912_supply_cost` (`unit_cost` decimal(10,4), `deduct_on_sale` default true), aplicada no dev (5433); `common/unit-cost.ts` (`parseUnitCost`) + `normalizeDecimal` compartilhado em `common/quantity.ts`; front `toApiDecimal`, campo "Custo por {unidade}", checkbox "Baixa automática na venda", colunas Custo/Baixa na venda. Backend 305 testes, frontend 216, lint 0, build ok; conferido no Firefox (`pl-back` reconstruído e reiniciado). Próximo: 3.0b.
- Queijo: peça = compra, bandeja = uso (fatiado), "mussarela 36g" = porção do CMV. **Confirmado:** a porção aponta para "Queijo bandeja" (0,036 kg, com custo e baixa); a peça fica só no estoque e na lista de compras.

## PRÓXIMA SESSÃO: importação da planilha de custos (plano pronto, nada implementado)
- **Ler `docs/plano-importacao-cardapio.md`**: decisões das 4 rodadas de grill-me, etapas 3.0a (custo e baixa automática no insumo), 3.0b (lanches com categoria, composição, preço e CMV) e 3.0c (importador `menu-import`), além da verificação.
- Planilha: `docs/dataset-portallanches/plan_custo_2026junho.xlsm` (movida para a pasta ignorada; não versionar). Leitura para análise feita com openpyxl num venv do scratchpad (o host não tem openpyxl); o importador vai usar exceljs e precisa ler **fórmulas** (a composição está nelas, ex.: `=itens_custos!F11*2`).
- Decisões principais: adianta "itens + composição" do Entregável 3 **sem** mexer no pedido do caixa; composição na unidade de contagem do insumo; preço = coluna PV (`AO`) arredondado **para cima em R$ 0,10**; categoria + nome igual (Tradicional, Artesanal, Adicionais); porções, açaí e coberturas **fora**; embalagens entram na composição; baixa automática **opcional por insumo** (tomate não; o insumo continua no Estoque); produção própria (hambúrguer artesanal, vinagrete, molho verde) = insumo pronto com custo; CMV calculado, preço sugerido depois.
- Pendências do açaí (preço, custo do copo) saíram do plano junto com o açaí.
- Preferência do usuário vista nesta sessão: `/grill-me` para decidir, plano salvo em `docs/`, commit e **sessão nova para implementar** (evitar contexto longo).

## Sessão 5 (fim): commits do Entregável 2
Oito commits (`df816cc` a `dd06127`): requisitos, dia da semana, clientes (2.1), identidade visual, insumos (2.2), estoque (2.3), lista de compras (2.4), handoff. Arquivos que mudaram em mais de uma entrega foram separados com versões intermediárias gravadas no índice (`git hash-object` + `git update-index --cacheinfo`). Cada commit foi conferido isolado num worktree (build + testes do backend e do frontend: 208→290 e 126→210 testes).

## Sessão 5: demo recriada com a planilha importada
- O banco de dev (container `portallanches-db-1` + volume `portallanches_pgdata`) tinha sumido e agora há um **Postgres nativo no host em 127.0.0.1:5432**; por isso o usuário mudou o `docker-compose.yml` para **5433** (alteração dele, sem commit).
- Recriado: `docker compose up -d db` (5433), `migrate deploy`, seed (**usuários voltaram a `admin/admin123` e `caixa/caixa123`**, banco novo), importação aplicada com `docs/dataset-portallanches/corrections-demo.json` (= `corrections.json` + as 3 sugestões: joao `skip`, 127,20, 100,00). Resultado: 203 dias, 1962 pedidos, R$ 99.445,60. `corrections.json` original intacto (produção segue pendente da decisão do usuário).
- `pl-back` recriado com `-e DATABASE_URL=postgresql://postgres:postgres@localhost:5433/portallanches` (sem isso ele cai no Postgres nativo e dá "database does not exist"). `backend/.env` não foi alterado (ainda aponta para 5432).
- Depois: o usuário **aprovou as 3 sugestões** (joao `skip`, 127,20, 100,00); agora estão no `corrections.json` (o `corrections-demo.json` foi apagado). Falta só rodar a importação em produção (passo a passo no README).
- Task do dia da semana (feita, sem commit): `formatDateWithWeekday` em `history/date-keys.ts` ("21/09/2026 - Segunda"); título do caixa usa. O histórico já mostrava "ter 22/09". Frontend 126 testes, lint 0, build ok.
- DoD do Entregável 1 conferido: funcionalmente pronto; falta deploy + importação em produção e um dia real fechado só pelo sistema. `docs/mvp-pdv-requisitos.md` atualizado com a janela de 7 dias do caixa (sem commit).
- **Entregável 2 — decisões do usuário (`/grill-me`, 2 rodadas; nenhum código ainda):**
  - Cliente **obrigatório só na entrega**; caixa busca por **telefone** e o sistema preenche; pode lançar **sem telefone** (nome + endereço). **1 telefone = 1 endereço**; endereço novo substitui no cadastro, pedidos antigos guardam o endereço da época (snapshot). Bairro do cliente = cadastro de bairros/taxa existente. Importados ficam sem cliente.
  - Estoque só muda por **contagem periódica** (sem baixa por pedido, que é do Entregável 3). Contagem informa o **total do insumo** e o sistema desconta dos lotes que vencem primeiro (FEFO).
  - **Lotes** com quantidade e validade próprias (ex.: 2 fardos de iT Laranja com validades diferentes = 2 lotes). Aviso de validade: **7 dias** (padrão).
  - Compra continua **só gasto**; entrada no estoque é lançamento separado. Ideia futura: ler NF-e e lançar gasto + estoque juntos.
  - "Item" neste entregável = **só insumo**. Cada insumo tem **uma unidade de contagem** + **embalagens** com conversão fixa (caixa = 36 un). Queijo peça e queijo bandeja = **2 insumos** (corte não é registrado).
  - **Estoque mínimo** opcional por insumo (na unidade de contagem) entra já (critério "itens críticos").
  - Caixa **e** admin lançam contagem e entradas. Na contagem, cada insumo pode ficar com número, **"não contado"** ou **"precisa comprar"** (sem número). Validade do lote é opcional (sem validade = descontado por último).
  - Exportação em **texto**, com escolha dos insumos: saldo atual para fazer compras.
  - Contagem **por sobrescrita** nesta entrega; no Entregável 3 bebidas etc. viram **subtração** (sugerir baixa pelos pedidos da noite) com sobrescrita opcional: guardar contagens/entradas como **movimentos**. Referência de produto: software **Consumer**.
  - **Entrega 2.1 (clientes) feita, sem commit:** backend `src/customers/` (`GET /customers?phone=`, `POST`, `PUT /customers/:id`, abertos a logados; `CustomerZoneCheck` exige bairro ativo), migration `20260923232401_customers` (tabela `customers` + `orders.customer_id/name/phone/address`; também alinha a FK de `payment_method_id` ao schema). Pedido de entrega agora manda **`customerId`** (não mais `deliveryZoneId`): bairro vem do cliente, taxa do bairro salvo sobrescrita, snapshot do cliente no pedido. Front: campos Telefone/Nome/Endereço na entrega, busca no blur do telefone (`use-customer-lookup`), `customer-draft.ts` (só grava cliente se mudou), `save-order` grava bairro novo → cliente → pedido; coluna "Cliente" na lista. Backend 226 testes, frontend 139, lint 0, builds ok; migration aplicada no dev, `pl-back` reiniciado; conferido no Firefox headless (`puppeteer-core` no scratchpad; `setViewport` não funciona no BiDi). Dados de teste apagados.
  - **Ajustes pedidos depois (sem commit):** "Endereço" virou **Rua** (sem número; objetivo: ranking de bairros e ruas) — migration nova `20260924000000_customer_street` só renomeia colunas (`customers.street`, `orders.customer_street`); apagar/refazer a migration anterior foi **bloqueado pelo classificador de permissões**, por isso a migration de rename. Na entrega, Telefone/Nome/Rua/Bairro+Taxa vêm **antes** de Valor/Pagamento; foco após salvar volta ao 1º campo (Telefone na entrega, Valor no balcão).
  - **Visual (passada 5, `frontend/src/styles/polish.css`):** identidade "balcão de lanchonete": fundo frio, grafite, **mostarda** (`--brand`, preenchimento com texto escuro; `--brand-strong` é o tom para texto), ketchup (erro), picles (aberto); fonte de título **Bricolage Grotesque** (`@fontsource-variable`, local); ícones **lucide-react** (nav, Sair, Atualizar, Editar/Apagar, Adicionar); botões "tecla" (sobem no hover, afundam no clique); sem caixa alta em rótulos; a **comanda** (form de pedido) com faixa mostarda e borda picotada; cabeçalho fixo. Form de entrega não é sticky (mais alto que a tela). Foco com anel escuro (mostarda não tem contraste). Conferido no Firefox headless claro e escuro (`extraPrefsFirefox: {'ui.systemUsesDarkTheme': 1}`; viewport via `defaultViewport: null` + args `-width/-height`).
  - **Sugestão de ruas (feito, sem commit):** `GET /customers/streets[?deliveryZoneId=]` (distintas, alfabéticas); front `use-street-suggestions` (só busca com Entrega selecionada; filtra pelo bairro digitado, sem bairro = todas) + datalist no campo Rua; ao sair do campo, `snapStreet` (`cash/street-key.ts`: sem acento/caixa, expande "R."/"Av."/"Tv.") adota a grafia já cadastrada. Backend 227 testes, frontend 149; conferido no Firefox.
  - Após reiniciar o PC: `docker compose up -d db` e `docker restart pl-back` (o pl-back sobe antes do banco e cai). O scratchpad perde o `node_modules` do puppeteer-core.
  - **Entrega 2.2 (cadastro de insumos) feita, sem commit:** migration `20260925225752_supplies` (`supplies` + `supply_packages`, Decimal(10,3)); backend `src/supplies/` (`GET /supplies` logado; `POST`/`PUT` admin; PUT troca a lista de embalagens), `common/quantity.ts` (`parseQuantity`, até 3 casas, sem zeros à direita). Front: aba **Insumos** em Cadastros (`catalog/SuppliesTab`, `SupplyForm` novo/edição no topo com linhas de embalagem, `supply-form-values.ts`, `use-supply-form.ts`), `api/supply-api.ts`, `api/quantity.ts`. Unidade vem "un" e seleciona tudo ao focar. Backend 251 testes, frontend 173; conferido no Firefox; dados de teste apagados.
  - **Entrega 2.3 (estoque) feita, sem commit:** migration `20260925232937_stock` (`stock_lots` com `remaining`, `stock_movements` ENTRY/COUNT com sinal, `stock_counts` COUNTED/NOT_COUNTED/NEEDS_PURCHASE). Backend `src/stock/` (`fefo.ts` planCount/sortByExpiry puros, `stock-status.ts` buildStockItem com alertas e `EXPIRY_WARNING_DAYS = 7`, `stock-input.ts`, `stock.service.ts` com CLOCK+BUSINESS_TIMEZONE, `prisma-stock.repository.ts` com contagem numa transação); `common/quantity.ts` ganhou `toMilli/fromMilli/multiplyQuantities`; `readBusinessTimeZone` saiu do closing.module para `closing/business-date.ts`. Rotas `/stock` abertas a caixa e admin. Sobra na contagem = lote sem validade; "precisa comprar" some com a próxima entrada. Bug achado no teste real e corrigido: `lastCount` vinha `undefined` (sumia do JSON) sem contagem. Front: página **/estoque** (link para todos) com abas Situação (filtro "só os que precisam de atenção"), Entrada (conversão prévia "Soma 12 un"), Contagem (número ou marca por linha; linhas em branco não vão); `styles/stock.css`. Backend 290 testes, frontend 203; conferido no Firefox como caixa; dados de teste apagados.
  - **Entrega 2.4 (lista de compras) feita, sem commit:** só frontend, aba "Lista de compras" em /estoque (`stock/ShoppingListTab.tsx`, `shopping-list.ts` gera o texto: "Precisa de atenção" e "Saldo atual"; seleção lembrada no localStorage via `selection-storage.ts`, padrão = só críticos; `text-export.ts` copia/baixa .txt). **Na demo (HTTP pelo IP) `navigator.clipboard` não existe**: a cópia usa o plano B (selecionar + `execCommand('copy')`), conferido no Firefox pelo IP. Fakes nomeados em `test-support/fake-stock-export.ts`. Frontend 210 testes.
  - **Entregável 2 completo** (2.1 clientes, 2.2 insumos, 2.3 estoque, 2.4 lista). Tudo sem commit. Pendências: conferir com o usuário; produção (deploy + importação da planilha) segue pendente.
  - Decisões completas em `docs/mvp-pdv-requisitos.md` (seção do Entregável 2). Plano: 1) clientes no pedido de entrega, 2) cadastro de insumos, 3) lotes + contagem + status, 4) exportação em texto.
  - **Sem celular** neste entregável.
- Havia containers de uma pilha de produção local parados (`portallanches-web-1`, `-backend-1`, `-migrate-1`) e o volume `portallanches_pgdata_prod`: não mexi.

## Sessão 4: importação da planilha histórica (implementada; **falta o usuário decidir 3 erros e gravar em produção**)
Pedido: importar `docs/dataset-portallanches/ticket-medio-2026.xlsx` (o usuário citou `./docs/dataset/ticket-medio2026`, o caminho real é esse) para o banco de produção, que ele testa no dia seguinte.
Decisões do usuário: campos que a planilha não tem ficam **nulos** no banco; motoboy (2ª linha de `Gastos-<Mês>`) vira gasto tipo "Motoboy", demais gastos tipo "Importado (sem categoria)"; dias `CLOSED`, autor admin, `closed_at` = data do dia; dry-run + aborta tudo se houver erro ou data já existente; ignorar abas `logout`, `Fechamento-Ano`, `Login`; pasta `docs/dataset-portallanches/` no `.gitignore`; **avisar de qualquer erro da planilha**.
- Migration `20260921120000_nullable_imported_order_fields`: `orders.type`, `payment_method_id`, `delivery_fee` viram NULL (a CHECK de balcão segue válida). **Já aplicada no banco de dev; falta `migrate deploy` em produção** (o compose de produção já roda sozinho no `up`).
- Backend: `OrderRecord`/`ReportOrderRow` com campos nuláveis; relatório ganhou `withoutPaymentMethod {count,total}` (diário e período) para fechar a soma; taxa nula conta 0. Front: `Order` nulável, lista mostra "—", abrir pedido importado para edição deixa pagamento em branco, aba Relatório mostra "Sem forma de pagamento".
- Importador em `backend/src/ticket-import/` (leitor exceljs atrás de `WorkbookReader`, plano puro `buildImportPlan`, `runImport`, `PrismaImportTarget` transacional) + CLI `backend/prisma/import-ticket-medio.ts` (`npm run import:ticket-medio -- <xlsx> [--corrections json] [--apply]`). `exceljs` é devDependency. Seção no README.
- Testado: apply real num banco descartável (1962 pedidos, R$ 99.445,60, 200 motoboy + 238 outros gastos, 203 dias; 2ª execução bloqueada; banco apagado). **Nada foi gravado no banco de dev nem no de produção.** Dry-run no dev acusa também 2026-09-19 (dia de teste que já existe lá).
- Erros da planilha: `docs/dataset-portallanches/corrections.json` já corrige os inequívocos (Janeiro!A→01-10, Gastos-Janeiro!B→01-11, Maio!H→05-09, Agosto!E→08-06, Gastos-Agosto!J→08-14, Setembro!H e Gastos-Setembro!H→09-09). **Pendem decisão do usuário (bloqueiam o `--apply`):** `Gastos-Fevereiro!X` (cabeçalho "joao", valor −30), `Julho!E13` = 127,203 e `Gastos-Julho!E4` = 100,003 (3 casas). Avisos (não bloqueiam): Abril!T10 "-", motoboy 0 em Gastos-Fevereiro!M2, dias sem gastos (Fev 16, Jun 14, Ago 14), dia só com gastos (Set 16).
- Testes: backend 208 (30 arquivos), frontend 125, lint e build ok.
- README tem o passo a passo de produção (`docker compose run migrate npx tsx prisma/import-ticket-medio.ts ...`), **ainda não executado em produção**. Na demo (dev) a importação foi gravada (203 dias, 1948 pedidos; 19/09 ignorado por já existir lá) com os 3 erros pendentes resolvidos pelas sugestões (joao ignorado, 127,20, 100,00); backup do dev antes da importação só na pasta temporária da sessão.
- Também nesta sessão: histórico do admin agora mostra o "Total do período" na primeira linha (`PeriodTable.tsx`); `pl-back` roda `dist/` e precisa de build + restart (ver "Servidores no ar").
- **Futura task pedida pelo usuário:** mostrar o dia da semana junto às datas (ex.: na página do caixa: "Caixa de 21/09/2026 - Domingo").

## Sessão 3 (parte 5): senhas e produção (feito)
- **Credenciais trocadas no banco de dev** pelo usuário: admin e caixa têm novos login (`username` e `name`) e senha; `admin/admin123` e
  `caixa/caixa123` agora dão 401. **As senhas novas não estão em nenhum arquivo do repositório** (o usuário as conhece). A API só troca
  senha (`POST /users/:id/password`); login (`username`) só por SQL: `docker exec portallanches-db-1 psql -U postgres -d portallanches`.
- Seed (`b096f44`): só cria usuários padrão se não houver nenhum ADMIN (senão recriaria `admin/admin123`). Com `SEED_REQUIRE_PASSWORDS=true`
  (usado no compose de produção) o seed exige `SEED_*_PASSWORD` com 8+ caracteres.
- **Produção preparada e testada de ponta a ponta** (pilha isolada, depois desmontada): `backend/Dockerfile` (builder/migrate/deps/runtime),
  `frontend/Dockerfile` + `nginx.conf` (estático, fallback do React, cache, cabeçalhos, proxy `/api`), `docker-compose.prod.yml`
  (db com healthcheck, `migrate` roda `prisma migrate deploy` e termina, backend com healthcheck, web publica só `WEB_PORT`), `.env.prod.example`.
  Seção "Produção" no README. Seed é manual e só na 1ª vez.
- **Pendências de produção:** HTTPS (hoje HTTP puro; precisa de domínio/certificado ou proxy como Caddy), sessões em memória (reiniciar desloga),
  rotina de backup do Postgres, o servidor de demo (`pl-front`/`pl-back`) segue em modo desenvolvimento e deve ser trocado pela pilha de produção.

## Sessão 3 (parte 4): cadastros — formas de pagamento e diária do motoboy (feito)
Decisões do usuário: **sem tela de usuários** ("caixa e admin já está ótimo"); ordem dos pagamentos irrelevante (sem reordenar; forma nova entra
no fim com `sortOrder = maior + 1`); diária errada se corrige cadastrando de novo o mesmo grupo+data (**backend agora faz upsert**, commit `44bb63e`);
mudança de diária vale só para dias ainda sem lançamentos (dias já criados guardam a diária com que nasceram).
- Backend: `MotoboyRateRepository.save` (upsert por `dayGroup_effectiveFrom`) no lugar de `create`; 184 testes.
- Front: `NamedEntryRow` + `NewNameForm` (compartilhados por tipos de gasto e pagamentos), `PaymentMethodsTab` (última forma ativa não desativa: botão
  bloqueado com dica), `MotoboyRatesTab` (`RateGroupCard` com vigente + histórico "Vigente/Agendada", `NewRateForm`, `rates-view.ts` com `currentRate`),
  `LoadFailure`, `CatalogPage` com 4 abas (`today` injetável para testes). Diária: valor > 0 (`parseRateAmount`), data válida (`parseEffectiveFrom`).
- Testes: frontend 124, backend 184; lint 0; build ok. Conferido no navegador real (admin): abas Pagamentos e Diária (só leitura).
- Cuidado: teste com curl na diária deixou uma linha de 2031 no banco; foi apagada por SQL (`docker exec portallanches-db-1 psql -U postgres -d portallanches`).
  Não há rota de apagar diária/cadastro.

## Sessão 3 (parte 3): cadastros do admin — bairros e tipos de gasto (feito)
Decisões: página única `/cadastros` com abas; inativos escondidos por padrão ("Mostrar inativos"); desativar/ativar em 1 clique; nada é apagado.
- Sem mudança no backend (`PUT /delivery-zones/:id`, `PUT /expense-types/:id`; as listas já trazem inativos; 409 para nome repetido).
- Front: `pages/CatalogPage` (abas via `components/TabBar`, genérico; `CashTabs` agora o usa), `catalog/CatalogTab` (estrutura comum: formulário
  de novo, filtro de inativos, tabela, vazio/erro/skeleton), `ZonesTab`, `ExpenseTypesTab`, `EntryActions` (rótulos acessíveis "Editar Uru"),
  `NewEntryForm`, `use-catalog-list`, `use-row-action`, `catalog-values` (validação; taxa via `toApiMoney`), `catalog-errors` (409 vira
  mensagem em português). `api/catalog-admin-api.ts` só tem os PUT; listas/criação vêm do `CashApi`. Link "Cadastros" só para admin.
- Para as próximas abas (pagamentos, diária, usuários): criar `XTab` com `CatalogTab` e acrescentar em `TABS` de `CatalogPage`.
- Teste extra: bairro inativo sai das sugestões do caixa, mas pedido antigo mantém o nome.
- Banco de dev: "Embalagens" (tipo de teste) foi desativado pela tela. "Dunamis" (R$ 8,00) e "Motoboy" (tipo) são registros do usuário e ficaram.
- Testes: frontend 99, backend 182 (não mudou); lint 0; build ok. Conferido no navegador real (admin): lista, edição em linha, inativos.

## Sessão 3 (parte 2): histórico do admin, reabrir dia, fuso e escolha de data
Decisões do usuário (`/grill-me`): histórico = só tabela de dias + totais (sem gráfico/detalhe); reabrir = 1 clique, sem log;
cadastros só desativam/renomeiam e ficam para a leva seguinte (bairros e tipos de gasto antes de usuários); semana = terça a domingo.
- **Bug real achado:** o contêiner `pl-back` roda em UTC; às 22h de domingo em Brasília o servidor achava que era segunda (21/09) e
  bloqueava tudo. Correção (commit `9152066`): `toBusinessDate(moment, timeZone)` usa `BUSINESS_TIMEZONE` (padrão `America/Sao_Paulo`),
  nunca o fuso da máquina. A **segunda-feira deixou de ser bloqueada** (código + migration `20260921000000_allow_monday_closings`
  que remove a CHECK; diária de segunda usa o grupo FRI_SUN).
- **Escolha de data (commit `f569027` + front):** rotas do caixa aceitam `?date=YYYY-MM-DD` (`/closings/today`, `/closings/today/close`,
  `/closings/today/report`, `/orders/today`, `/expenses/today`, `POST /orders`, `POST /expenses`). Caixa escolhe hoje e os 7 dias anteriores
  (`SELECTABLE_DAYS_BACK` em `closing-access.ts`); admin qualquer data. **Consultar dia sem lançamentos não grava**: `getFor` devolve fechamento
  vazio `id: 0`; `getOrCreateFor` cria no 1º lançamento ou ao fechar (evita somar a diária do motoboy em dias vazios e dias criados por clique
  no calendário). `ClosingLookup` agora: `getFor`, `getOrCreateFor`, `getById`, `assertEditable`, `getByDate`.
- **Front:** `createCashApi(api, date|null)`; `CashierPage` guarda a data e remonta `CashDayScreen` por `key`; `DayPicker` (input date + "Voltar
  para hoje"); erro 403 da janela mostra mensagem com botão de voltar. Histórico em `/historico` (só admin, `RequireAdmin`; link no `AppShell`):
  `pages/HistoryPage`, `history/*` (`period-range`, `date-keys` com data local, `use-period-report` descarta respostas velhas, `PeriodTable`,
  `DayActionButton`: reabrir direto, fechar com confirmação). Admin vê "Reabrir dia" no aviso de dia fechado (`ClosedNotice`).
- Verificado no navegador real (Firefox headless via `puppeteer-core`/BiDi, 1366px) contra o backend real: caixa em 20/09, data passada, data
  bloqueada, histórico semana/mês/personalizado. Não conferido: celular, tema escuro, login, Entrega/edição no navegador.
- Testes: backend 182, frontend 77; lint 0 nos dois; build ok. `pl-back` reiniciado com o build novo (migration aplicada no banco de dev).
- Segurança de rede/HTTPS e senhas padrão do seed continuam pendentes.

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
- **Atenção:** `pl-back` executa `node dist/main.js` (código compilado, sem watch). Depois de mudar o backend: `npm run build` em `backend/` (via Docker `node:24`) e `docker restart pl-back`. Sem isso a demo roda código velho (na sessão 4 isso quebrou o relatório do caixa nos dias importados com HTTP 500).
No fim da sessão o usuário pediu para expor o frontend na rede: **http://192.168.1.113:5173/** (logins e senhas do admin e do caixa foram trocados pelo usuário nesta sessão e **não** são registrados no repositório). Rodam como containers Docker `--restart unless-stopped`, com bind mount do código:
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

## Como rodar (Node 24 agora existe no host via nvm; os comandos do projeto seguem via Docker `node:24`)
Node roda via Docker `node:24` (Node 22 quebra o `npm ci` por causa do lockfile):
`docker run --rm --network host -u $(id -u):$(id -g) -e HOME=/tmp -v $PWD:/app -w /app node:24 <cmd>`
dentro de `backend/`. Postgres: `docker compose up -d db`. Detalhes no `README.md`.

## Próximos Passos / Pendências
0. **Importação:** erros decididos (sessão 5); falta rodar dry-run e `--apply` em produção (backup antes com `pg_dump`). Task do dia da semana feita na sessão 5.
1. Usuário conferir na demo (http://192.168.1.113:5173/) o visual novo, o seletor de data e o histórico (admin). O dia 20/09 está aberto no banco de dev.
2. Cadastros do admin concluídos (bairros, tipos de gasto, pagamentos, diária). **Usuários ficam de fora por decisão do usuário.** **Celular fica para a 3ª ou 4ª entrega (decisão do usuário): não fazer agora.** Próximas ideias: HTTPS, backup automático, conferir tema escuro e formulário de Entrega/edição no navegador (o usuário dispensou por ora).
3. (Feito) Logins/senhas do seed trocados no banco de dev; o seed agora só cria usuários em banco sem admin. Em produção nova, defina `SEED_*_PASSWORD`.
4. Opcional: teste de integração contra Postgres; limite de tentativas de login; totais de gastos por tipo no relatório.
