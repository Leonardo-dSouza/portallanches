# Plano: importação da planilha de custos (insumos, lanches e composição)

Planilha: `docs/dataset-portallanches/plan_custo_2026junho.xlsm` (fora do git). Plano aprovado em
2026-09-25 após 3 rodadas de grill-me; **implementação ainda não começou**.

## Contexto

O usuário quer trazer para o sistema a planilha de custos da lanchonete. Ela tem insumos com preço
pago, lanches tradicionais e artesanais, adicionais, açaí e coberturas, a composição de cada lanche
(escondida nas fórmulas) e o preço de venda calculado (PV = CMV ÷ 0,42).

Hoje o sistema só tem **insumos contáveis** (`supplies`, 2.2) e **estoque por lotes** (2.3). Não há
produto, receita nem preço. Esta entrega **adianta a parte "itens + composição" do Entregável 3**,
mas o caixa ainda não lança pedido por lanche (isso e a baixa por venda seguem no Entregável 3).

## Decisões do grill-me (3 rodadas)

- **Escopo:** insumos (com custo) + lanches + composição + preço de venda + CMV calculado. Pedido do caixa não muda.
- **Composição na unidade de contagem do insumo:** X Salada usa 0,036 kg de queijo, 1 un de hambúrguer 56g. A gramatura sai das fórmulas da planilha.
- **Preço de venda:** coluna **PV** (`AO`) de `Lanches`/`Lanches_Artesanal`, **arredondada para cima em R$ 0,10** (17,7177 → 17,80). Os preços novos, quando chegarem, são editados na tela.
- **Categoria + nome igual:** Tradicional, Artesanal, Adicionais, Açaí, Coberturas. A chave é (categoria, nome). A tela e, no futuro, o pedido mostram "X Salada · Artesanal". A importação casa por (categoria, nome), então rodar de novo atualiza em vez de duplicar.
- **Entram:** lanches tradicionais (24) e artesanais (22), adicionais (15), açaí e coberturas (`Produto_2`, valores = **custo**), embalagens na composição (hamburgueira, sachês, saquinho, papel). **Porções ficam de fora.**
- **Baixa automática opcional por insumo** (tomate não, hambúrguer sim). O insumo sem baixa **continua no Estoque** (situação, contagem, lista de compras) e entra no CMV. Só não terá baixa por venda no Entregável 3.
- **Produção própria** (hambúrguer artesanal carne/frango, toscana, vinagrete, molho verde) vira **insumo pronto com custo por unidade** tirado da ficha (ex.: R$ 5,99 o de carne). Ficha de produção fica para depois.
- **CMV** = Σ (quantidade × custo unitário do insumo), calculado na leitura. Preço sugerido fica para depois.
- **Açaí segue a lógica do tomate:** vem em caixa de 10 L, então vira o insumo "Açaí" (L, embalagem caixa = 10) **sem baixa automática**. Quando estiver acabando, entra na lista do dia ("precisa comprar").
- **Preço do açaí e das coberturas não está na planilha** (o atual é 300 ml puro = 8,50 e adicional leite condensado = 3,50; nenhum dos dois aparece no arquivo). Entram sem preço e são preenchidos na tela, ou o usuário manda a lista.
- **Pendente para a próxima sessão:** os custos por copo de `Produto_2` não formam um custo por litro único (300 ml → 11,67/L; 500 ml → 9,00/L; 700 ml → 7,86/L; o copo provavelmente está incluído). Decidir se o copo vira insumo de embalagem ou se o CMV do açaí usa o custo por tamanho.

## Como retomar
Sessão nova: ler este arquivo e o `MEMORY.md`. Começar pela etapa 3.0a, confirmando antes que o exceljs
abre `.xlsm`. Resolver a pendência do açaí com o usuário antes da etapa 3.0c.

## Etapas (uma entrega e um commit cada, como no Entregável 2)

### 0. Planilha fora do git (feito)
Já movida para `docs/dataset-portallanches/`, que é ignorada pelo git (decisão da sessão 4).

### 3.0a Custo e "baixa automática" no insumo
- `schema.prisma` `Supply`: `unitCost Decimal(10,4)?` (custo por unidade de contagem; nulo = sem custo) e `deductOnSale Boolean @default(true)`. Migration nova.
- `backend/src/supplies/supply-input.ts`: `unitCost` opcional via um `parseUnitCost` (até 4 casas; seguir o padrão de `common/quantity.ts`) e `deductOnSale` opcional (default true). Ajustar `prisma-supply.repository.ts` e os testes.
- Front `catalog/SupplyForm.tsx` + `supply-form-values.ts`: campos "Custo por {unidade}" e "Baixa automática na venda", com uma dica curta. `SuppliesTab`: coluna Custo. `api/types.ts` `Supply`.

### 3.0b Lanches (produtos) com composição, preço e CMV
- Schema: `ProductCategory {name, nameKey unique, sortOrder, active}`, `Product {categoryId, name, nameKey, description?, salePrice Decimal(10,2)?, active; @@unique([categoryId, nameKey])}`, `ProductComponent {productId, supplyId, quantity Decimal(10,3); @@unique([productId, supplyId])}`.
- Backend `src/products/`, mesmo padrão de `src/supplies/` (input puro, repository atrás de interface, service, controller, module):
  - `GET /product-categories` e `GET /products` (logado). Cada produto vem com `components[]` (nome/unidade/custo do insumo), `cmv` e `cmvComplete` (false se algum insumo não tem custo).
  - `POST/PUT` só admin. O PUT troca a lista de componentes. Nome repetido na categoria → 409 via o filtro que já existe.
  - O CMV sai de uma função pura `computeCmv(components)` em `products/cmv.ts`, com a aritmética de `common/quantity.ts` estendida para custo com 4 casas (sem float).
- Front: aba **Lanches** em Cadastros (`catalog/ProductsTab.tsx`, `ProductForm.tsx`, `product-form-values.ts`):
  - lista agrupada por categoria com preço, CMV e margem;
  - formulário novo/edição no topo, com linhas de componente (insumo + quantidade na unidade dele), no mesmo padrão das linhas de embalagem do `SupplyForm`;
  - reaproveitar `CatalogTab`, `EntryActions`, `useCatalogList` e `useRowAction`.

### 3.0c Importador `menu-import`
Mesmo desenho do `backend/src/ticket-import/`: simulação por padrão, tudo ou nada, qualquer erro bloqueia, avisos não bloqueiam.
- **Leitura:** um leitor que devolve **valor e fórmula** de cada célula (`FormulaWorkbookReader`, com exceljs atrás da interface). O `ExcelJsWorkbookReader` atual só entrega o resultado. Reaproveitar `ImportIssue`/`hasErrors`/`ImportOutcome` de `ticket-import/import-types.ts` e `columnLetter`/`cellAt` de `sheet-grid.ts`. **Primeiro passo:** confirmar que o exceljs abre `.xlsm`.
- **Mapeamento revisável** `docs/dataset-portallanches/cardapio-mapeamento.json` (ignorado pelo git). Eu gero um rascunho a partir da análise e o usuário confere. Cada linha de `itens_custos` vira:
  - o insumo contável: nome, unidade, custo unitário a partir de E/C/D, embalagem de compra (ex.: caixa = 36);
  - a porção que ela representa, na unidade do insumo. Ex.: linha 6 "Queijo mussarela 36g" → insumo "Queijo mussarela" (kg, R$ 39,90), porção 0,036.
  - Porções da mesma matéria-prima apontam para o mesmo insumo.
- **Plano puro** `buildMenuPlan(grids, mapping, corrections)` (testado com grids falsos):
  - lê cada linha de lanche e transforma cada fórmula `=itens_custos!F<n>[*k]` e as somas com `+` (embalagem) em componentes;
  - soma os componentes repetidos;
  - PV da coluna `AO` arredondado para cima em R$ 0,10;
  - descrição casada por nome em `Cardápio_LT`/`Cardápio_LA`;
  - linhas: `Lanches` 2–25 = Tradicional, `Lanches_Artesanal` 2–24 = Artesanal, `Lanches` 32–46 = Adicionais; `Produto_2` = Açaí (3 tamanhos) e Coberturas, com composição 1:1 no insumo de mesmo nome.
- **Autoconferência:** o CMV recalculado de cada lanche deve bater com a coluna `AK` da planilha (±R$ 0,01). Se não bater, é erro.
- **Erros que já vão aparecer** (resolvidos com o `corrections.json`, formato do ticket-import):
  - X Tudo `F18` = `'xx'`;
  - X Tudo `H18` e X Brócolis com valores digitados (brócolis/azeitona/milho não existem em `itens_custos`);
  - X Tudo `D18` usa `E4` em vez de `F4`.
- **Avisos:**
  - nome diferente da fórmula ("Bacon 50g" calcula 70 g, "Salsicha 56g" calcula 60 g; vale a fórmula);
  - maionese comum × grill nos artesanais;
  - números em texto em `itens_custos` D19/D20/D23/D32;
  - "X Burguer Duplo Normal" está no cardápio sem linha de custo.
- **Gravação transacional** (`PrismaMenuImportTarget`):
  - insumo existente (mesmo nome) → atualiza só custo e embalagens; unidade diferente = erro;
  - categorias e produtos por (categoria, nome), fazendo upsert;
  - nunca apaga nada.
- **CLI** `backend/prisma/import-cardapio.ts` + `npm run import:cardapio -- <xlsm> --mapping <json> [--corrections <json>] [--apply]`. Seção no README.

## Arquivos principais
- `backend/prisma/schema.prisma` + 2 migrations (3.0a e 3.0b)
- `backend/src/supplies/*`, `backend/src/products/*` (novo), `backend/src/menu-import/*` (novo), `backend/prisma/import-cardapio.ts`
- `frontend/src/catalog/Supply*`, `frontend/src/catalog/Product*` (novo), `frontend/src/api/{types,supply-api,product-api}.ts`, `pages/CatalogPage.tsx`
- `docs/mvp-pdv-requisitos.md` (Entregável 3 parcialmente adiantado; citar este plano), `docs/banco-de-dados.md`, `README.md`, `MEMORY.md`

## Verificação
- Testes unitários: `parseUnitCost`, `computeCmv`, inputs de produto, `buildMenuPlan` (fórmulas simples, com multiplicador, com soma, célula digitada → erro, autoconferência do CMV, arredondamento do PV), service com repositório falso nomeado. Front: `product-form-values`, página de Lanches com `FakeApiClient`. Todos pelo `npm test` via Docker `node:24`; lint e build nos dois lados.
- Simulação contra a planilha real no banco de dev (porta 5433): conferir o relatório, com a contagem por categoria, os erros esperados e o CMV batendo com `AK`.
- `--apply` no dev, depois conferir no navegador (Firefox headless, como nas entregas anteriores): aba Lanches com preço, CMV e margem, e aba Insumos com custo e baixa automática. Rodar a importação de novo para confirmar que não duplica.
- Cada commit checado isolado (worktree + build + testes), como foi feito nos 8 commits do Entregável 2.
- Produção fica para depois, com o mesmo roteiro da planilha histórica (backup, simulação, `--apply`).
