# AI Memory & Context Handoff

Última atualização: 2026-10-06, sessão 11 (produção no servidor novo; CI/CD em andamento). Tudo commitado e no GitHub.
O histórico detalhado por sessão (1 a 6) está no git (`git log -p MEMORY.md`); aqui fica só o estado atual e o que ainda morde.

## Status Atual
- **Entregável 1 (fechamento de caixa):** completo. Auth, fechamento diário, pedidos, gastos, relatório, histórico do admin, reabrir dia, escolha de data (caixa: hoje + 7 dias; admin: qualquer data), cadastros (bairros, tipos de gasto, pagamentos, diária do motoboy). Sem tela de usuários (decisão do usuário).
- **Entregável 2 (clientes e estoque):** completo. Cliente obrigatório só na entrega (busca por telefone, 1 telefone = 1 endereço, "Rua" sem número + sugestão de ruas), insumos com embalagens, estoque com lotes FEFO e contagem por sobrescrita, lista de compras em texto.
- **Entregável 3 (cardápio → pedido por item):** a base do cardápio está pronta (3.0a custo por insumo e baixa automática opcional, 3.0b lanches com categoria/composição/preço/CMV, 3.0c importador da planilha de custos, quadro de lanches com número, busca e filtros, bebidas importadas, aba **Importação** no admin). **Pedido por item feito na sessão 10** (comanda pelo teclado, preço e CMV da época, açaí cadastrado). Falta a **baixa no estoque** (pergunta 4).
- Planos e decisões: `docs/mvp-pdv-requisitos.md`, `docs/plano-importacao-cardapio.md`, `docs/plano-pedido-por-item.md`.
- Frontend React + Vite + TypeScript + Tailwind v4, desktop primeiro (celular fica para depois, por decisão do usuário). Identidade "balcão de lanchonete" (mostarda, Bricolage Grotesque, lucide-react).
- Listas sem paginação: tudo cabe numa tela, com filtros e busca (pedido do usuário).

## Sessão 11 (2026-10-06) — produção no servidor novo
- **Servidor:** notebook Dell antigo em **192.168.1.109** (Pentium T4300 2 núcleos, 3,8 GB, Debian 13, cabo, **sem bateria**). Acesso `ssh leonardo@192.168.1.109` com a chave do PC de dev. Docker oficial instalado; repo em `~/portallanches`; `.env.prod` próprio criado lá (senha de banco nova). Tudo em `docs/servidor-producao.md`.
- **Nunca fazer build no note:** o `compose build` com os 2 núcleos a 100% derrubou a máquina (log cortado, sem desligamento; fonte ou temperatura). As imagens foram montadas no PC de dev e enviadas com `docker save | gzip | ssh docker load`. A suspensão foi desligada com `systemctl mask` (ela suspendia sozinha mesmo com a tampa ignorada).
- **Banco da prod = cadastro do dev sem movimento** (decisão do usuário): `pg_dump` do dev, restore e `TRUNCATE ... RESTART IDENTITY` de pedidos, itens, gastos, fechamentos, clientes, lotes, movimentos e contagens. Motivo: a migration `20261002120000_supply_daily_count_cleanup` não faz nada num banco vazio, então seed + importação perderiam a revisão dos insumos da sessão 9.
- **Usuários de prod:** `portallanches_admin` e `portallanches_caixa` (o usuário passou as senhas; não ficam no repo). O username foi trocado por SQL (a API não troca username) e as senhas pela API `POST /users/:id/password`. Conferido: senhas novas 200, antigas 401, front pela rede 200, tela do caixa ok.
- **Pegadinha:** na 1ª subida o Postgres liga um servidor temporário; esperar `init process complete` nos logs antes do `pg_restore`.
- A prod antiga do PC de dev continua desligada, com o volume intacto; não é mais usada.

## Sessão 10 (2026-10-02) — pedido por item
- Grill-me (respostas em `docs/plano-pedido-por-item.md`, com o mapa de teclas): itens do cardápio; lote no fim da noite; PC com teclado numérico; número + busca num campo; **artesanal = número com ponto/vírgula** (`9.`); bebidas/adicionais só pela busca; um pagamento por pedido; **valor = itens + taxa** (o usuário confirmou que o "Valor" antigo já incluía a taxa).
- **Banco:** migration `20261002130000_order_items` (`order_items` com cópias de nome/número/categoria, `quantity` 1–99 com CHECK, `unit_price`, `unit_cmv` nulo sem composição, `cmv_complete`). Migration `20261002131000_acai_menu`: categorias "Açaí" e "Adicionais do açaí" + 18 produtos com os preços do usuário (300ml 8,50; 500ml 12,50; 700ml 16,00; adicionais 3,50 / Ovomaltine 4,00 / 5,00), `import_source` nulo, sem composição.
- **Backend (`src/orders`):** `order-input.ts` aceita `items` (1–50 linhas, produto repetido é recusado) e **recusa `amount`**; `order-pricing.ts` (`priceOrderLines`: preço do cadastro, 422 para inativo/sem preço, **na edição a linha que já estava mantém preço e CMV da época**; `orderAmount` em centavos); `OrderCatalog.findProductsForSale`; o repositório grava/troca as linhas com o pedido. O relatório não mudou (continua somando `amount`).
- **Front (`src/cash`):** lógica pura testada em `item-command.ts` (parser), `menu-lookup.ts` (`menuItemsOf`, `findByNumber`, `searchMenu`), `item-preview.ts`, `order-lines.ts` (linhas, prévia do total em centavos — exceção consciente ao "não somar no cliente": o valor gravado vem da API). Hook `use-order-items`; componentes `OrderItemField` (combobox com prévia e lista), `OrderLines` (cupom), `PaymentKeys` (teclas 1–4). `OrderForm`: foco inicial no Item, F2 troca o tipo, Ctrl+Enter salva, Enter nos campos da entrega passa de campo. Depois de salvar, a comanda volta para Balcão **sem pagamento** (para não herdar o da comanda anterior). Lista de pedidos: Itens, Tipo e pagamento juntos, bairro sob o cliente, taxa sob o valor, Editar/Apagar só com ícone. Estilos em `styles/order-pad.css`; a coluna da comanda passou para 28 rem.
- Conferido no dev (playwright-core + Chromium): balcão com 5 linhas e pagamento = **30 teclas**; total de R$ 96,50 e entrega R$ 43,30 + R$ 5,00 = R$ 48,30, iguais ao cadastro. Os pedidos e o cliente de teste foram apagados no fim.
- Testes: backend **485**, frontend **326**; lint 0 e build ok. Os testes de pedidos do Caixa estão em `pages/CashierOrders.spec.tsx` (helpers em `test-support/render-cashier.tsx`).

## Sessão 9 (2026-10-02)
- **Parte 2 (revisão dos insumos feita na lanchonete, contagem do dia e botões):** migration `20261002120000_supply_daily_count_cleanup` (`supplies.daily_count` em Alface, Bacon, Calabresa, Ovo e Tomate; queijo bandeja + peça = "Queijo peça" com baixa; "Pão de hot dog" separado do "Pão de hambúrguer" com o mesmo custo, e os Hots usam ele via `supplySwaps` na config da importação; "Caixinha para artesanal"; seções corrigidas; ocultos: Azeitona, Milho, Pão australiano, Fanta Uva, Skol latão/garrafinha, Colher de molho e Molho verde, que continuam no CMV). A importação passou a trocar **só as embalagens que a planilha conhece** (`packageWrites`: um galão criado na tela fica). Contagem do dia: interruptor "Contar todo dia", atalho "Contagem do dia" na Contagem e alerta "Contar hoje" na Situação ("Não contado" não tira a pendência). Botões: tudo em `styles/buttons.css` (teclas de caixa registradora; `.toggle-key` travada para baixo; `SwitchField`). Seções numa linha própria. Bug antigo corrigido: a comanda ficava 96 px abaixo do lugar.
- **Commits (todos no nome do usuário, sem atribuição a IA) + push para `origin/main`:** `chore: compose de dev...`, `feat: estoque com seções, seed dos insumos, preço de venda e compra com custo`, `fix: nº 30 do X Queijo Egg Salada...` e este handoff.
- **Nº 30 do X Queijo Egg Salada:** confirmado pelo usuário. `ProductGroup.fixedNumbers` (nome → número) em `menu-types.ts`, lido por `parseFixedNumbers` em `menu-mapping.ts` (inteiro > 0) e aplicado em `menu-plan.ts` **só quando o `Cardápio_LT` não numera o lanche (a planilha vence)**. Config: grupo `Lanches_Artesanal` de `cardapio-mapeamento.json`. Simular o cardápio no dev agora dá "Mudanças: nenhuma". Vale para a tela de Importação e para a CLI.
- **Produção esquecida (pedido do usuário):** saiu das pendências. Continua desligada; volume e arquivos intactos. Só voltar a ela se o usuário falar.
- X Tudo tradicional (descrição cita contra filé e 4x queijo): o usuário vai pedir a correção na planilha a quem cuida dela; não é tarefa nossa.
- Testes: backend **455**, frontend **276**; lint 0 e build ok nos dois.

## Sessão 8 (2026-10-01)
- **Compose de dev:** `docker-compose.yml` agora sobe `db` + `backend` + `frontend` (imagem `node:24`, bind mount, usuário `${DEV_UID:-1000}:${DEV_GID:-1001}`, `restart: unless-stopped`). Backend: `npm ci` se faltar `node_modules`, `prisma generate`, `prisma migrate deploy`, `npm run start:dev` (watch: recarrega ao salvar). Front: `vite --host 0.0.0.0` com `BACKEND_URL=http://backend:13000`. Rede do compose (não mais `--network host`); portas no host continuam 15433/13000/15173. O volume do banco é o mesmo (`portallanches_pgdata`).
- Os contêineres avulsos `pl-back` e `pl-front` foram **removidos** (o banco de dev estava parado havia 1 dia). Conferido: migrations "No pending", front 200, login admin pelo proxy `/api` 200, edição em `src/main.ts` recompilou e reiniciou a API.
- README ganhou a seção "Como rodar em desenvolvimento (compose)".
- **Melhorias do estoque (grill-me + plano aprovado; plano em `~/.claude/plans/no-insumos-assim-como-snug-puffin.md`):**
  - **Seções:** migration `20261001120000_supply_sections` (tabela `supply_sections` com 9 seções já inseridas + `supplies.section_id`). `GET /supplies/sections`; `sectionId` no insumo (422 se não existir) e em cada item de `GET /stock`. Front: `stock/supply-sections.ts` (filtrar/agrupar/contar, "Sem seção" por último), `SectionFilterBar`, `SectionedRows`, `use-section-filter`; usados em Insumos, Situação, Entrada e Contagem; a Lista de compras só agrupa. `CatalogTab` ganhou `toolbar(shown)`, `narrow` e `renderBody`.
  - **Seed da anotação do usuário:** `src/supplies/seed/supply-seed-list.ts` (lista por seção, com nomes corrigidos e `aliases` = nome já existente no banco) + `planSupplySeed` (puro, testado). `seedSupplies` no `seed.ts`: o que já existe é ignorado (só ganha seção se não tiver); o resto é criado com `un`, sem baixa e sem custo. O usuário conferiu o de-para e pediu para **deixar inativas** as 7 bebidas inativas da lista. Dev: 66 criados, 53 ganharam seção; a 2ª rodada não fez nada. Sem seção ficaram 6 ativos fora da anotação (Batata palha, Molho verde, Papel acoplado, Colher de molho, Coca Cola 2l, Original 300ml).
  - **Preço de venda nos insumos:** é gravado no **produto 1:1** (`pickSaleProduct` em `src/supplies/sale-product.ts`: produto ativo, só este insumo, quantidade 1). Pegam bebidas e adicionais de 1 un (Add ovo, Add hambúrguer 56g, pães...). `GET /supplies` traz `saleProduct {id, name, salePrice, importSource}`; `PUT` com `salePrice` (ausente = não mexe; null = tira) grava o produto na mesma transação; 422 sem produto 1:1. Na tela: coluna "Venda" e campo "Preço de venda (Cardápio: <nome>)" com aviso de que a reimportação sobrescreve.
  - **Lançamento de estoque:** migration `20261001130000_stock_entry_cost_reversal` (`stock_lots.unit_cost`, `stock_lots.reversed_at`, enum `REVERSAL`). `POST /stock/entries` aceita `{items: [...]}` (objeto solto = 1 item) numa transação; cada item tem `paid` + `paidPer` ('total' | 'unit' = por embalagem digitada). Com valor pago, o custo do insumo vira o **último custo pago** (`unitCostFromPaid`, 4 casas, sem float). `GET /stock/entries?days=30` (máx. 90; até 200 linhas) e `POST /stock/entries/:lotId/reversal` (só entrada intacta, `assertReversible`; o custo do insumo **não** volta). Front: `EntryTab` virou grade da compra inteira por seção (`EntryGridRow`) + `EntryHistory` com "Desfazer" em 2 cliques.
  - Tabela de insumos: a coluna "Situação" saiu (tag "Inativo" ao lado do nome) e "Baixa na venda" virou "Baixa", para caber sem rolar em 1440 px.
  - NF-e: só avaliada (XML na mão = dificuldade média, o trabalho é o de-para produto da nota → insumo/embalagem; só com chave/DANFE = difícil, exige certificado A1). Não implementada.
- Testes: backend **449**, frontend **276**; lint 0 e build ok nos dois. Conferido no Chromium headless (Situação, Entrada com filtro, Contagem, Insumos com seção/preço; compra com custo + desfazer pela tela). Custos de teste do "Detergente" foram limpos.

## Sessão 7 (2026-09-30), resumo (detalhe em `git log -p MEMORY.md`)
- Portas: dev front 15173, API 13000, banco 15433; produção web 18480 e banco 127.0.0.1:15480 (hoje desligada).
- Números do cardápio: "X Burguer Duplo" artesanal = 27 (correção no nome das abas de consulta); o 28 normal o usuário cadastra à mão.
- Importação de planilhas pela tela (Cadastros → Importação) para cardápio e bebidas: `POST /imports/:kind`, config versionada em `src/spreadsheet-import/config/*.json`, `products.import_source`; item que sumiu da mesma planilha é desativado e a importação nunca reativa. Só 12 bebidas ativas (`docs/bebidas-ativas.sql`).
- A planilha de bebidas fica em `docs/dataset-portallanches/Bebidas.xlsx` (fora do git: o repositório é público).
- Git: o histórico foi reescrito para tirar a atribuição a IA (SHAs antigos citados em docs não batem). **Nunca** pôr atribuição a IA em commit/PR.

## PRÓXIMA SESSÃO
1. Começar lendo este arquivo, `docs/servidor-producao.md` e `docs/plano-pedido-por-item.md`.
1. **CI/CD (pedido do usuário, em andamento):** testes, lint e build no GitHub; imagens publicadas no GHCR; deploy na `main` por um runner self-hosted no servidor (o note só baixa as imagens, nunca faz build). Falta o token de registro do runner e ativar no GitHub a aprovação manual para workflows de PR de fork (o repo é público).
2. **Baixa no estoque (pergunta 4):** agora os pedidos têm itens. Decidir **quando** baixar (a cada pedido ou ao fechar o dia) e **como a revisão manual aparece** para os itens que não baixam sozinhos. Entram aqui o rendimento do frango (compra 1,5 kg, vira 1,2 kg) e a ideia de sugerir a baixa das bebidas pelos pedidos da noite. Grill-me antes de codar.
3. Relatório com CMV e lucro do dia/período usando `order_items` (o CMV da época já está gravado). Perguntar ao usuário antes.
4. Açaí sem composição (CMV incompleto): cadastrar os insumos e as porções quando o usuário passar. Porções (não citadas) ainda não estão no cardápio.
5. Completar na planilha de bebidas os custos e preços que faltam e reimportar (no dev). Galão do ketchup/mostarda: quando souberem o peso, editar o insumo (a importação preserva).

## Decisões que valem para tudo
- Dinheiro: o front aceita só dígitos + vírgula/ponto, com até 2 casas, e nunca soma no cliente (os totais vêm da API). Somas no backend em centavos inteiros ou BigInt.
- Nada é apagado nos cadastros (`active: false`). Apagar pedido ou gasto não pede confirmação; fechar o dia pede, em 2 passos.
- O dia de negócio vira em `BUSINESS_TIMEZONE` (America/Sao_Paulo), nunca no fuso da máquina (bug real: o contêiner em UTC).
- A diária do motoboy é copiada para o fechamento quando o dia nasce (1º lançamento ou fechamento; consultar um dia vazio não grava).
- Cardápio e bebidas: **a planilha sempre vence** na reimportação (a simulação mostra antes → depois; nada é apagado; o que sumiu da mesma planilha é desativado). Adicionais são produtos soltos. Açaí fica fora da planilha (`Produto_2` ignorada) e foi cadastrado por migration. Queijo é um insumo só, "Queijo peça" (a porção de 0,036 kg aponta para ele). Os Hots usam "Pão de hot dog" via `supplySwaps`.
- Estoque: a contagem é por sobrescrita. No Entregável 3 as bebidas e itens parecidos devem virar subtração (sugerir baixa pelos pedidos da noite). A baixa automática é opcional por insumo (`deduct_on_sale`).
- Pedido por item: lançamento em lote no fim da noite pelo teclado; o caixa **não** altera preço nem total (a API recusa `amount`); **valor = itens + taxa**; o pedido guarda preço e CMV da época, e a edição mantém os das linhas que já estavam.
- Referência de produto: software **Consumer**.

## Ambientes
- **Dev (demo):** `docker compose up -d` (projeto `portallanches`): Postgres em **15433**, API em **13000**, front em **15173** (http://192.168.1.113:15173). Recarga automática nos dois; não precisa mais `npm run build` + restart. Logs: `docker compose logs -f backend`. Existe também um Postgres nativo no host em 5432: não usar.
- **Produção (desde 2026-10-06):** servidor 192.168.1.109, http://192.168.1.109:18480, banco 127.0.0.1:15480 no próprio servidor. Comandos em `~/portallanches` com `docker compose --env-file .env.prod -f docker-compose.prod.yml ...`. Ver `docs/servidor-producao.md`.
- **Produção antiga no PC de dev (DESLIGADA desde 2026-10-02, não é mais usada; está atrás do dev nas migrations da sessão 8):** os contêineres foram removidos com `down` (sem `-v`) para não subirem sozinhos no boot; o volume `portallanches-prod_pgdata_prod` com os dados continua. Religar só quando ele pedir: `docker compose --env-file .env.prod -f docker-compose.prod.yml up -d`. Era http://192.168.1.113:18480, com banco em 127.0.0.1:15480 e `docker compose --env-file .env.prod -f docker-compose.prod.yml ...` (projeto `portallanches-prod`, volume `portallanches-prod_pgdata_prod`). O volume antigo `portallanches_pgdata_prod` (sem hífen) é de uma pilha anterior: não mexer.
- Credenciais: o dev usa `admin`/`admin123` e `caixa`/`caixa123`; a produção nova usa `portallanches_admin` e `portallanches_caixa` (senhas com o usuário). O seed só cria usuários se não houver admin; em produção nova, exige `SEED_*_PASSWORD`.
- Se um dia a produção voltar: HTTPS, sessões em memória (reiniciar desloga), backup automático do Postgres, senhas definitivas.

## Como rodar e testar
- Node via Docker `node:24` (Node 22 quebra o `npm ci`): `docker run --rm --network host -u $(id -u):$(id -g) -e HOME=/tmp -v $PWD:/app -w /app node:24 <cmd>`, dentro de `backend/` ou `frontend/`.
- Com o compose de pé: `docker compose exec backend npm test` (e `frontend`). `npm test` (Vitest), `npm run lint`, `npm run build`. Última contagem: backend **485**, frontend **326**. Atenção: `npm run build` no backend apaga o `dist` que o watch usa (a API voltou sozinha, mas confira). Não há teste automatizado contra banco real (só fakes).
- Importadores: `npm run import:ticket-medio` e `npm run import:cardapio` (sem `--apply` = simulação). Os arquivos ficam em `docs/dataset-portallanches/` (fora do git). Para o dev, a URL padrão já aponta para 15433; monte a raiz do repo (`-v $PWD/..:/app -w /app/backend`).
- Para ler a planilha fora do importador: script Node com `exceljs` de `backend/node_modules` (o host não tem `openpyxl`).
- Conferência visual: `playwright-core` no scratchpad (`npm i playwright-core@1`) com `executablePath` = `~/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome`; `colorScheme: 'dark'` para o tema escuro. Espere ~250 ms antes do print (as transições de 150 ms enganam). Abas têm número no nome ("Situação5"): clique por índice. "Não contado: Ovo" casa com "Ovomaltine": use `exact: true`. O dev é usado pelo usuário: apague os pedidos de teste no fim.

## Regras que morderam
- Prisma 7 com driver adapter: o alvo do P2002 vem em `meta.driverAdapterError.cause.constraint`.
- Métodos de service que validam entrada precisam ser `async`, senão `rejects.toThrow` falha.
- Vite `erasableSyntaxOnly` proíbe parameter properties; o lint do React barra ref dentro do objeto retornado por hook e setState direto em `useEffect`.
- Tailwind v4: `@apply card` falha (classe de componente não é utility).
- Na demo por HTTP pelo IP, `navigator.clipboard` não existe: use o plano B `execCommand('copy')`.
- `.claude/` está no `.gitignore` por decisão do usuário.
- `<kbd>` dentro de botão ou rótulo entra no nome acessível ("Salvar pedidoCtrl+Enter", "1PIX"): use `aria-hidden` na dica de tecla.
- oxlint (React Compiler) reclama de `ref={props.algumRef}`: desestruture a prop antes de usar.
- Hover de `.toggle-key` precisa excluir a tecla ligada (`:not([aria-pressed='true'])`), senão o texto some com o mouse em cima.
