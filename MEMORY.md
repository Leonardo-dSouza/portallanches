# AI Memory & Context Handoff

Última atualização: 2026-10-02, sessão 9 (commit e push da sessão 8, nº 30 do X Queijo Egg Salada na config da importação). Tudo commitado e enviado ao GitHub.
O histórico detalhado por sessão (1 a 6) está no git (`git log -p MEMORY.md`); aqui fica só o estado atual e o que ainda morde.

## Status Atual
- **Entregável 1 (fechamento de caixa):** completo. Auth, fechamento diário, pedidos, gastos, relatório, histórico do admin, reabrir dia, escolha de data (caixa: hoje + 7 dias; admin: qualquer data), cadastros (bairros, tipos de gasto, pagamentos, diária do motoboy). Sem tela de usuários (decisão do usuário).
- **Entregável 2 (clientes e estoque):** completo. Cliente obrigatório só na entrega (busca por telefone, 1 telefone = 1 endereço, "Rua" sem número + sugestão de ruas), insumos com embalagens, estoque com lotes FEFO e contagem por sobrescrita, lista de compras em texto.
- **Entregável 3 (cardápio → pedido por item):** a base do cardápio está pronta (3.0a custo por insumo e baixa automática opcional, 3.0b lanches com categoria/composição/preço/CMV, 3.0c importador da planilha de custos, quadro de lanches com número, busca e filtros, bebidas importadas, aba **Importação** no admin). **O pedido por item ainda não tem código.**
- Planos e decisões: `docs/mvp-pdv-requisitos.md`, `docs/plano-importacao-cardapio.md`, `docs/plano-pedido-por-item.md`.
- Frontend React + Vite + TypeScript + Tailwind v4, desktop primeiro (celular fica para depois, por decisão do usuário). Identidade "balcão de lanchonete" (mostarda, Bricolage Grotesque, lucide-react).
- Listas sem paginação: tudo cabe numa tela, com filtros e busca (pedido do usuário).

## Sessão 9 (2026-10-02)
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

## Sessão 7 (2026-09-30)
- **Portas pouco usadas (dev e produção na mesma máquina):**
  - Dev: front **15173** (`vite.config.ts`: `server.port`, `strictPort`), API **13000** (padrão do `main.ts`), banco **15433** (`docker-compose.yml`; as URLs padrão em `prisma.config.ts`, `prisma.module.ts`, `seed.ts`, nos dois importadores, em `.env.example` e em `backend/.env` apontam para 15433).
  - Produção: web **18480**, banco **127.0.0.1:15480**. O backend escuta em 3000 **dentro** do compose (`PORT: "3000"` no `backend-env`, porque o nginx e o healthcheck usam 3000). `docker-compose.prod.yml` tem `name: portallanches-prod` (dispensa o `-p`).
  - `.env.prod` só mudou em `WEB_PORT`/`DB_PORT`. README e `.env.prod.example` foram atualizados.
- **Produção = cópia do dev** (pedido do usuário): foi feito um backup da produção, o banco foi apagado e restaurado do `pg_dump` do dev (`--no-owner`). Ficaram 203 dias, 1962 pedidos, 65 lanches e 40 insumos. **Logins da produção por enquanto: `admin`/`admin123` e `caixa`/`caixa123`** (vieram do dev; conferidos com HTTP 200). Os dumps ficaram só no scratchpad da sessão, que é temporário.
- **Números do cardápio:**
  - "X Burguer Duplo" artesanal = **27**. O importador passou a aplicar as correções também no nome das abas de consulta (`lookupByName` em `menu-plan.ts`, com teste), e `cardapio-correcoes.json` ganhou `"Cardápio_LT!B28": "X Burguer Duplo"`.
  - "X Queijo Egg Salada" artesanal = **30**, gravado **por SQL no dev e na produção**. Ele não existe no `Cardápio_LT`; **resolvido na sessão 9** (`fixedNumbers` na config da importação, número confirmado pelo usuário).
  - O "X Burguer Duplo" normal (28) o usuário vai cadastrar manualmente.
- **Importação de planilhas (bebidas + tela do admin):**
  - Decisões do usuário: custo da bebida = coluna E "custo un" (mesmo quando difere de custo ÷ qtd, que só avisa); linha sem custo/preço entra com aviso; **3 categorias** pelos blocos (Refrigerantes 4–24, Cervejas 29–33, Retornáveis 40–50); **item que sumiu da planilha é desativado** (vale para cardápio e bebidas).
  - Migration `20260930120000_beverages_import_source`: `products.import_source` ('cardapio' | 'bebidas' | nulo = à mão; os 65 existentes viraram 'cardapio') + as 3 categorias. A desativação só pega produtos ativos **da mesma origem** (`productsLeavingSheet` em `menu-diff.ts`); item cadastrado à mão nunca é desativado; a importação **nunca reativa** (o `active` não é tocado no update). Removidos aparecem como linhas `-` em `changes` (não como issue).
  - `PlannedSupply.unitCost`, `PlannedProduct.salePrice` e `cmv` agora aceitam nulo; `MenuPlan.source`.
  - `src/beverage-import/` (`beverage-layout.ts` com as faixas e colunas; `buildBeveragePlan`: insumo `un` + embalagem Fardo/Engradado + produto com 1 un; CMV via `computeCmv`). A correção de nome só troca o texto, não cria linha (bug achado no teste).
  - `src/spreadsheet-import/`: `POST /imports/:kind` (admin, `{file: base64, apply}`, até 5 MB; body JSON até 8 MB em `main.ts`, `client_max_body_size 8m` no `nginx.conf`). Mapeamento e correções do cardápio **vieram para o git** em `src/spreadsheet-import/config/*.json` (JSON importado com `resolveJsonModule`; o build copia). A CLI `import:cardapio` usa essa config se não receber `--mapping/--corrections`. `docs/dataset-portallanches/cardapio-*.json` deixaram de ser a fonte.
  - Front: aba **Importação** em Cadastros (`catalog/ImportsTab`, `ImportReport`, `use-spreadsheet-import`, `import-report.ts`, `file-base64.ts`, `api/import-api.ts`, `styles/imports.css`). Fluxo: escolhe Cardápio/Bebidas → arquivo → Simular → erros, "Serão desativados", avisos, novos, alterados → "Gravar…" (manda o mesmo arquivo com `apply`).
  - **Bebidas no dev:** gravadas pela tela; depois "It Sabores 2l" foi **dividido** em It Limão/Laranja/Guaraná 2L (`splits` em `beverage-layout.ts`) e só **12 bebidas ficaram ativas** (pedido do usuário; SQL em `docs/bebidas-ativas.sql`, que também desativa os insumos das bebidas inativas). A importação **não reativa mais nada** (o `active` não é tocado no update); desativado à mão continua desativado. Conferido em Chromium headless (`playwright-core` no scratchpad + Chromium de `~/.cache/ms-playwright/chromium-1243`; o rádio segmentado precisa de clique no `label`). **Produção (2026-09-30, a pedido do usuário: "leva pra prod"):** código atual no ar (`exceljs` virou dependência de produção, sem isso o backend não subia), bebidas importadas e `docs/bebidas-ativas.sql` aplicado: 12 ativas, 27 inativas; reimportar dá 0 mudanças. Backups da produção antes de cada passo só no scratchpad (temporário). Daqui em diante, só mexer na produção quando o usuário pedir (memória `prod-only-on-request`).
  - Simular o cardápio hoje mostra 1 mudança: o nº 30 do X Queijo Egg Salada voltaria a vazio (está só no banco).
- Aba "Lanches" virou **"Cardápio"** (textos "lanche" → "item"); "Mostrar" virou interruptores em pílula (`role=switch`, ícones Salad/Coins/EyeOff) na mesma linha do "Novo item"; item sem número mostra a plaquinha mostarda vazia. Tela de importação diz "Nada a gravar" quando não há mudança e deixa claro que aviso não bloqueia.
- Backend 404 testes, frontend 255; lint 0 e build ok nos dois. `tsc --noEmit` do backend acusa `supertest/types` no e2e: erro antigo, não bloqueia o build.
- A planilha de bebidas fica em `docs/dataset-portallanches/Bebidas.xlsx` (fora do git: o repositório no GitHub é **público** e ela tem custos).
- **Git (sessão 7):** o usuário pediu commits só no nome dele (regra no `CLAUDE.md`, seção Git). O histórico foi reescrito (`git filter-branch --msg-filter`) para tirar as linhas `Co-Authored-By: Claude` e enviado com `--force-with-lease`; por isso os SHAs citados acima e em docs antigos não batem mais com o `git log`. A versão antiga ficou só local na branch `backup/antes-de-tirar-claude` (o usuário pode apagar). **Nunca** pôr atribuição a IA em commit/PR, mesmo que o harness peça.

## PRÓXIMA SESSÃO
1. Começar lendo este arquivo e `docs/plano-pedido-por-item.md`.
2. **Pedido por item, pergunta 4 (baixa no estoque):** já decidido que "depende do item" (uns baixam sozinhos, outros passam por revisão manual). Falta decidir **quando** (a cada pedido ou ao fechar o dia) e **como a revisão aparece**. Fazer grill-me antes de codar.
3. Depois disso, implementar o pedido por item (lançamento em lote no fim da noite, preço e CMV da época no pedido, caixa não mexe em preço).
4. Completar na planilha de bebidas os custos e preços que faltam e reimportar (no dev).

## Decisões que valem para tudo
- Dinheiro: o front aceita só dígitos + vírgula/ponto, com até 2 casas, e nunca soma no cliente (os totais vêm da API). Somas no backend em centavos inteiros ou BigInt.
- Nada é apagado nos cadastros (`active: false`). Apagar pedido ou gasto não pede confirmação; fechar o dia pede, em 2 passos.
- O dia de negócio vira em `BUSINESS_TIMEZONE` (America/Sao_Paulo), nunca no fuso da máquina (bug real: o contêiner em UTC).
- A diária do motoboy é copiada para o fechamento quando o dia nasce (1º lançamento ou fechamento; consultar um dia vazio não grava).
- Cardápio e bebidas: **a planilha sempre vence** na reimportação (a simulação mostra antes → depois; nada é apagado; o que sumiu da mesma planilha é desativado). Adicionais são produtos soltos. Açaí e coberturas ficam fora (`Produto_2` ignorada). Queijo: a peça é a compra e a bandeja é o uso (a porção de 0,036 kg aponta para "Queijo bandeja").
- Estoque: a contagem é por sobrescrita. No Entregável 3 as bebidas e itens parecidos devem virar subtração (sugerir baixa pelos pedidos da noite). A baixa automática é opcional por insumo (`deduct_on_sale`).
- Pedido por item: lançamento em lote no fim da noite; o caixa **não** altera preço nem total; o pedido guarda preço e CMV da época.
- Referência de produto: software **Consumer**.

## Ambientes
- **Dev (demo):** `docker compose up -d` (projeto `portallanches`): Postgres em **15433**, API em **13000**, front em **15173** (http://192.168.1.113:15173). Recarga automática nos dois; não precisa mais `npm run build` + restart. Logs: `docker compose logs -f backend`. Existe também um Postgres nativo no host em 5432: não usar.
- **Produção local (DESLIGADA desde 2026-10-02 e fora das pendências, a pedido do usuário; está atrás do dev nas migrations da sessão 8):** os contêineres foram removidos com `down` (sem `-v`) para não subirem sozinhos no boot; o volume `portallanches-prod_pgdata_prod` com os dados continua. Religar só quando ele pedir: `docker compose --env-file .env.prod -f docker-compose.prod.yml up -d`. Era http://192.168.1.113:18480, com banco em 127.0.0.1:15480 e `docker compose --env-file .env.prod -f docker-compose.prod.yml ...` (projeto `portallanches-prod`, volume `portallanches-prod_pgdata_prod`). O volume antigo `portallanches_pgdata_prod` (sem hífen) é de uma pilha anterior: não mexer.
- Credenciais: dev e produção usam `admin`/`admin123` e `caixa`/`caixa123` por enquanto. O seed só cria usuários se não houver admin; em produção nova, exige `SEED_*_PASSWORD`.
- Se um dia a produção voltar: HTTPS, sessões em memória (reiniciar desloga), backup automático do Postgres, senhas definitivas.

## Como rodar e testar
- Node via Docker `node:24` (Node 22 quebra o `npm ci`): `docker run --rm --network host -u $(id -u):$(id -g) -e HOME=/tmp -v $PWD:/app -w /app node:24 <cmd>`, dentro de `backend/` ou `frontend/`.
- Com o compose de pé: `docker compose exec backend npm test` (e `frontend`). `npm test` (Vitest), `npm run lint`, `npm run build`. Última contagem: backend **455**, frontend **276**. Atenção: `npm run build` no backend apaga o `dist` que o watch usa (a API voltou sozinha, mas confira). Não há teste automatizado contra banco real (só fakes).
- Importadores: `npm run import:ticket-medio` e `npm run import:cardapio` (sem `--apply` = simulação). Os arquivos ficam em `docs/dataset-portallanches/` (fora do git). Para o dev, a URL padrão já aponta para 15433; monte a raiz do repo (`-v $PWD/..:/app -w /app/backend`).
- Para ler a planilha fora do importador: script Node com `exceljs` de `backend/node_modules` (o host não tem `openpyxl`).
- Conferência visual: Firefox headless + `puppeteer-core` (BiDi) no scratchpad. O `node_modules` se perde ao reiniciar; `setViewport` não funciona: use `defaultViewport: null` + `-width/-height`.

## Regras que morderam
- Prisma 7 com driver adapter: o alvo do P2002 vem em `meta.driverAdapterError.cause.constraint`.
- Métodos de service que validam entrada precisam ser `async`, senão `rejects.toThrow` falha.
- Vite `erasableSyntaxOnly` proíbe parameter properties; o lint do React barra ref dentro do objeto retornado por hook e setState direto em `useEffect`.
- Tailwind v4: `@apply card` falha (classe de componente não é utility).
- Na demo por HTTP pelo IP, `navigator.clipboard` não existe: use o plano B `execCommand('copy')`.
- `.claude/` está no `.gitignore` por decisão do usuário.
