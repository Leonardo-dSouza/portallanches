# Plano: importação da planilha de custos (insumos, lanches e composição)

Planilha: `docs/dataset-portallanches/plan_custo_2026junho.xlsm` (fora do git). Plano aprovado em
2026-09-25 após 3 rodadas de grill-me e revisado na 4ª rodada (sessão 6); **implementação ainda não começou**.

## Contexto

O usuário quer trazer para o sistema a planilha de custos da lanchonete. Ela tem insumos com preço
pago, lanches tradicionais e artesanais, adicionais, açaí e coberturas, a composição de cada lanche
(escondida nas fórmulas) e o preço de venda calculado (PV = CMV ÷ 0,42).

Hoje o sistema só tem **insumos contáveis** (`supplies`, 2.2) e **estoque por lotes** (2.3). Não há
produto, receita nem preço. Esta entrega **adianta a parte "itens + composição" do Entregável 3**,
mas o caixa ainda não lança pedido por lanche (isso e a baixa por venda seguem no Entregável 3).

## Decisões do grill-me (rodadas 1 a 3; a 4ª rodada, logo abaixo, prevalece)

- **Escopo:** insumos (com custo) + lanches + composição + preço de venda + CMV calculado. Pedido do caixa não muda.
- **Composição na unidade de contagem do insumo:** X Salada usa 0,036 kg de queijo, 1 un de hambúrguer 56g. A gramatura sai das fórmulas da planilha.
- **Preço de venda:** coluna **PV** (`AO`) de `Lanches`/`Lanches_Artesanal`, **arredondada para cima em R$ 0,10** (17,7177 → 17,80). Os preços novos, quando chegarem, são editados na tela.
- **Categoria + nome igual:** Tradicional, Artesanal, Adicionais. A chave é (categoria, nome). A tela e, no futuro, o pedido mostram "X Salada · Artesanal". A importação casa por (categoria, nome), então rodar de novo atualiza em vez de duplicar.
- **Entram:** lanches tradicionais (24) e artesanais (22), adicionais (15), embalagens na composição (hamburgueira, sachês, saquinho, papel). **Porções, açaí e coberturas ficam de fora** (4ª rodada).
- **Baixa automática opcional por insumo** (tomate não, hambúrguer sim). O insumo sem baixa **continua no Estoque** (situação, contagem, lista de compras) e entra no CMV. Só não terá baixa por venda no Entregável 3.
- **Produção própria** (hambúrguer artesanal carne/frango, toscana, vinagrete, molho verde) vira **insumo pronto com custo por unidade** tirado da ficha (ex.: R$ 5,99 o de carne). Ficha de produção fica para depois.
- **CMV** = Σ (quantidade × custo unitário do insumo), calculado na leitura. Preço sugerido fica para depois.

## Decisões da 4ª rodada (sessão 6)
- **Importação recorrente:** a planilha é a v1 do cardápio novo e vai mudar. O importador `menu-import` completo continua valendo (fórmulas, mapeamento, autoconferência) e precisa rodar de novo sem duplicar.
- **A planilha sempre vence:** reimportar sobrescreve preço de venda, descrição e composição dos lanches que ela traz, e o custo e as embalagens dos insumos, mesmo que tenham sido editados na tela. Para não haver surpresa, a **simulação lista o que vai mudar** (preço antigo → novo, componentes que entram e saem, custo antigo → novo). Produto que existe no sistema mas sumiu da planilha **não é apagado nem desativado**: só aparece como aviso.
- **Queijo: compra × uso × porção.** "Queijo peça" é o que se compra (lista de compras); "Queijo bandeja" é o que se usa depois de fatiar (contagem); "Queijo mussarela 36g" é a **porção** que entra no X Salada e no CMV. No modelo, a porção não é insumo: é a linha de `itens_custos` mapeada para um insumo contável com uma quantidade. **Confirmado pelo usuário:** a porção aponta para "Queijo bandeja" (kg, 0,036), que recebe o custo por kg da planilha e tem baixa automática; "Queijo peça" fica só no estoque e na lista de compras, sem composição (o corte não é registrado, decisão do Entregável 2). O mapeamento precisa aceitar que o nome da linha da planilha seja diferente do nome do insumo.
- **Adicionais como produto** da categoria "Adicionais": aceito por enquanto. O vínculo "adicional preso ao lanche" (modificador) fica para o Entregável 3, sabendo que talvez exija migração.
- **Açaí e coberturas fora do escopo** (`Produto_2` inteira é ignorada). As pendências de preço e do copo do açaí saem deste plano e voltam quando o açaí for tratado.

## O que a planilha real mostrou (sessão 6, ao implementar a 3.0c)
- Faixas de linhas diferentes do previsto: `Lanches` 2–26 = Tradicional (25), 27–31 são porções (fora), **32–50** = Adicionais (19, incluindo "Add Cebola", "Add Cebola Roxa" e dois pães brioche); `Lanches_Artesanal` 2–24 com a linha 22 vazia (22 lanches). Por isso as faixas ficam no **mapeamento** (`groups`), não no código.
- As fórmulas não usam só a coluna F: há células "kit" em `itens_custos` (`H44` = 4 sachês de ketchup + 4 de maionese; `N21` = sachê de molho verde + saquinho; `N22` = copinho de molho verde + pote + colher; `H39` = saco kraft + papel acoplado + hamburgueira gourmet; `R10` = hambúrguer de toscana; `E4` = pão). O mapeamento `portions` é por **célula** e cada uma vira uma lista de (insumo, quantidade).
- Produção própria com custo lido da ficha: vinagrete `J18 ÷ 3` kg, molho verde `N18 ÷ 3` L, hambúrgueres artesanais `E9`, `E31`, `R10` por unidade.
- `Cardápio_LA` traz preços (C) diferentes do PV dos artesanais (ex.: X Burguer 23,40 × PV 35,62). O importador segue a decisão do plano (PV arredondado); os preços do `Cardápio_LA` não são usados.
- **Decisões do usuário na revisão do mapeamento:** X Tudo tradicional **sem contra filé** (`F18` "xx" = skip), com **4 hambúrgueres 56g** e filé de frango de **131 g** (o R$ 3,00 digitado em `H18` ÷ R$ 22,90/kg; `=itens_custos!F10*1.31`); queijo vale a fórmula (2 porções), não o "4x queijo" da descrição; **X Brócolis Egg removido** (`Lanches_Artesanal!B24` = skip); **nome do produto = coluna AJ** (nome do cardápio) quando existe, a coluna B só marca se a linha existe; **preço = PV** (os preços do `Cardápio_LA` não valem). Tradicional e artesanal são lanches distintos (pão, maionese, hambúrguer 150g e embalagem).
- Importado no banco de dev: 40 insumos, 65 lanches (25 tradicionais, 21 artesanais, 19 adicionais), 689 componentes; a 2ª execução não mostra mudanças.
- O `exceljs` abre o `.xlsm` e `cell.formula` já traduz fórmulas compartilhadas.

## Como retomar
Sessão nova: ler este arquivo e o `MEMORY.md`. Começar pela etapa 3.0a, confirmando antes que o exceljs
abre `.xlsm`.

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
  - linhas: `Lanches` 2–25 = Tradicional, `Lanches_Artesanal` 2–24 = Artesanal, `Lanches` 32–46 = Adicionais. `Produto_2` (açaí e coberturas) é ignorada.
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
  - produto existente → preço, descrição e composição sobrescritos pela planilha (a simulação mostra o antes e o depois);
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
