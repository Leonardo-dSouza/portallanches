# AI Memory & Context Handoff

Última atualização: 2026-09-30 (sessão 7: portas novas, produção = cópia do dev, números 27/30, 5 respostas do pedido por item, **importação de bebidas + aba Importação no admin**).
O histórico detalhado por sessão (1 a 6) está no git (`git log -p MEMORY.md`); aqui fica só o estado atual e o que ainda morde.

## Status Atual
- **Entregável 1 (fechamento de caixa):** completo. Auth, fechamento diário, pedidos, gastos, relatório, histórico do admin, reabrir dia, escolha de data (caixa: hoje + 7 dias; admin: qualquer data), cadastros (bairros, tipos de gasto, pagamentos, diária do motoboy). Sem tela de usuários (decisão do usuário).
- **Entregável 2 (clientes e estoque):** completo. Cliente obrigatório só na entrega (busca por telefone, 1 telefone = 1 endereço, "Rua" sem número + sugestão de ruas), insumos com embalagens, estoque com lotes FEFO e contagem por sobrescrita, lista de compras em texto.
- **Entregável 3 (cardápio → pedido por item):** a base do cardápio está pronta (3.0a custo por insumo e baixa automática opcional, 3.0b lanches com categoria/composição/preço/CMV, 3.0c importador da planilha de custos, quadro de lanches com número, busca e filtros, bebidas importadas, aba **Importação** no admin). **O pedido por item ainda não tem código.**
- Planos e decisões: `docs/mvp-pdv-requisitos.md`, `docs/plano-importacao-cardapio.md`, `docs/plano-pedido-por-item.md`.
- Frontend React + Vite + TypeScript + Tailwind v4, desktop primeiro (celular fica para depois, por decisão do usuário). Identidade "balcão de lanchonete" (mostarda, Bricolage Grotesque, lucide-react).
- Listas sem paginação: tudo cabe numa tela, com filtros e busca (pedido do usuário).

## Sessão 7 (2026-09-30)
- **Portas pouco usadas (dev e produção na mesma máquina):**
  - Dev: front **15173** (`vite.config.ts`: `server.port`, `strictPort`), API **13000** (padrão do `main.ts`), banco **15433** (`docker-compose.yml`; as URLs padrão em `prisma.config.ts`, `prisma.module.ts`, `seed.ts`, nos dois importadores, em `.env.example` e em `backend/.env` apontam para 15433).
  - Produção: web **18480**, banco **127.0.0.1:15480**. O backend escuta em 3000 **dentro** do compose (`PORT: "3000"` no `backend-env`, porque o nginx e o healthcheck usam 3000). `docker-compose.prod.yml` tem `name: portallanches-prod` (dispensa o `-p`).
  - `.env.prod` só mudou em `WEB_PORT`/`DB_PORT`. README e `.env.prod.example` foram atualizados.
- **Produção = cópia do dev** (pedido do usuário): foi feito um backup da produção, o banco foi apagado e restaurado do `pg_dump` do dev (`--no-owner`). Ficaram 203 dias, 1962 pedidos, 65 lanches e 40 insumos. **Logins da produção por enquanto: `admin`/`admin123` e `caixa`/`caixa123`** (vieram do dev; conferidos com HTTP 200). Os dumps ficaram só no scratchpad da sessão, que é temporário.
- **Números do cardápio:**
  - "X Burguer Duplo" artesanal = **27**. O importador passou a aplicar as correções também no nome das abas de consulta (`lookupByName` em `menu-plan.ts`, com teste), e `cardapio-correcoes.json` ganhou `"Cardápio_LT!B28": "X Burguer Duplo"`.
  - "X Queijo Egg Salada" artesanal = **30**, gravado **por SQL no dev e na produção**. Ele não existe no `Cardápio_LT`, então **uma reimportação do cardápio volta o número para vazio** até alguém incluir "30 | X Queijo Egg Salada" na planilha. O usuário disse "acho que é 30": confirmar.
  - O "X Burguer Duplo" normal (28) o usuário vai cadastrar manualmente.
- **Importação de planilhas (bebidas + tela do admin):**
  - Decisões do usuário: custo da bebida = coluna E "custo un" (mesmo quando difere de custo ÷ qtd, que só avisa); linha sem custo/preço entra com aviso; **3 categorias** pelos blocos (Refrigerantes 4–24, Cervejas 29–33, Retornáveis 40–50); **item que sumiu da planilha é desativado** (vale para cardápio e bebidas).
  - Migration `20260930120000_beverages_import_source`: `products.import_source` ('cardapio' | 'bebidas' | nulo = à mão; os 65 existentes viraram 'cardapio') + as 3 categorias. A desativação só pega produtos ativos **da mesma origem** (`productsLeavingSheet` em `menu-diff.ts`); item cadastrado à mão nunca é desativado; item inativo que volta à planilha é reativado. Removidos aparecem como linhas `-` em `changes` (não como issue).
  - `PlannedSupply.unitCost`, `PlannedProduct.salePrice` e `cmv` agora aceitam nulo; `MenuPlan.source`.
  - `src/beverage-import/` (`beverage-layout.ts` com as faixas e colunas; `buildBeveragePlan`: insumo `un` + embalagem Fardo/Engradado + produto com 1 un; CMV via `computeCmv`). A correção de nome só troca o texto, não cria linha (bug achado no teste).
  - `src/spreadsheet-import/`: `POST /imports/:kind` (admin, `{file: base64, apply}`, até 5 MB; body JSON até 8 MB em `main.ts`, `client_max_body_size 8m` no `nginx.conf`). Mapeamento e correções do cardápio **vieram para o git** em `src/spreadsheet-import/config/*.json` (JSON importado com `resolveJsonModule`; o build copia). A CLI `import:cardapio` usa essa config se não receber `--mapping/--corrections`. `docs/dataset-portallanches/cardapio-*.json` deixaram de ser a fonte.
  - Front: aba **Importação** em Cadastros (`catalog/ImportsTab`, `ImportReport`, `use-spreadsheet-import`, `import-report.ts`, `file-base64.ts`, `api/import-api.ts`, `styles/imports.css`). Fluxo: escolhe Cardápio/Bebidas → arquivo → Simular → erros, "Serão desativados", avisos, novos, alterados → "Gravar…" (manda o mesmo arquivo com `apply`).
  - **Bebidas no dev:** gravadas pela tela; depois "It Sabores 2l" foi **dividido** em It Limão/Laranja/Guaraná 2L (`splits` em `beverage-layout.ts`) e só **12 bebidas ficaram ativas** (pedido do usuário; SQL em `docs/bebidas-ativas.sql`, que também desativa os insumos das bebidas inativas). A importação **não reativa mais nada** (o `active` não é tocado no update); desativado à mão continua desativado. Conferido em Chromium headless (`playwright-core` no scratchpad + Chromium de `~/.cache/ms-playwright/chromium-1243`; o rádio segmentado precisa de clique no `label`). **Produção (2026-09-30, a pedido do usuário: "leva pra prod"):** código atual no ar (`exceljs` virou dependência de produção, sem isso o backend não subia), bebidas importadas e `docs/bebidas-ativas.sql` aplicado: 12 ativas, 27 inativas; reimportar dá 0 mudanças. Backups da produção antes de cada passo só no scratchpad (temporário). Daqui em diante, só mexer na produção quando o usuário pedir (memória `prod-only-on-request`).
  - Simular o cardápio hoje mostra 1 mudança: o nº 30 do X Queijo Egg Salada voltaria a vazio (está só no banco).
- Aba "Lanches" virou **"Cardápio"** (textos "lanche" → "item"); "Mostrar" virou interruptores em pílula (`role=switch`, ícones Salad/Coins/EyeOff) na mesma linha do "Novo item"; item sem número mostra a plaquinha mostarda vazia. Tela de importação diz "Nada a gravar" quando não há mudança e deixa claro que aviso não bloqueia.
- Backend 404 testes, frontend 255; lint 0 e build ok nos dois. `tsc --noEmit` do backend acusa `supertest/types` no e2e: erro antigo, não bloqueia o build.
- A planilha de bebidas fica em `docs/dataset-portallanches/Bebidas.xlsx` (fora do git: o repositório no GitHub é **público** e ela tem custos).
- **Git (sessão 7):** o usuário pediu commits só no nome dele (regra no `CLAUDE.md`, seção Git). O histórico foi reescrito para tirar as linhas `Co-Authored-By: Claude` e enviado com push forçado; por isso os SHAs citados acima e em docs antigos não batem mais com o `git log`.

## PRÓXIMA SESSÃO
1. Sessão 7 commitada e enviada (ver "Git" acima).
2. **Produção está igual ao dev** (código e cardápio). Próximas mudanças: só no dev; levar para a produção quando o usuário pedir.
3. Completar na planilha de bebidas os custos e preços que faltam e reimportar (no dev).
4. **Pedido por item:** as 5 respostas estão em `docs/plano-pedido-por-item.md`. Lançamento continua em lote no fim da noite. O pedido guarda o preço e o CMV da época. O caixa não mexe em preço. Baixa depende do item (automática ou revisão manual): ainda falta detalhar quando e como.
5. Pendências menores: incluir o nº 30 (X Queijo Egg Salada) na planilha; corrigir na planilha a descrição do X Tudo tradicional (cita contra filé e 4x queijo).

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
- **Dev (demo):**
  - Postgres `portallanches-db-1` em **15433** (`docker compose up -d db`). Existe também um Postgres nativo no host em 5432: não usar.
  - `pl-back` (`node dist/main.js`, API em **13000**, `-e DATABASE_URL=postgresql://postgres:postgres@localhost:15433/portallanches`). Depois de mudar o backend, rode `npm run build` e `docker restart pl-back`.
  - `pl-front` (`npx vite --host 0.0.0.0`, porta **15173** vem do config; proxy `/api` → 13000). Acesso: http://192.168.1.113:15173.
  - Os dois rodam com `--network host --restart unless-stopped` e bind mount do código. Depois de reiniciar o PC: `docker compose up -d db` e então `docker restart pl-back`.
- **Produção local:** http://192.168.1.113:18480, com banco em 127.0.0.1:15480 e `docker compose --env-file .env.prod -f docker-compose.prod.yml ...` (projeto `portallanches-prod`, volume `portallanches-prod_pgdata_prod`). O volume antigo `portallanches_pgdata_prod` (sem hífen) é de uma pilha anterior: não mexer.
- Credenciais: dev e produção usam `admin`/`admin123` e `caixa`/`caixa123` por enquanto. O seed só cria usuários se não houver admin; em produção nova, exige `SEED_*_PASSWORD`.
- Pendências de produção: HTTPS, sessões em memória (reiniciar desloga), backup automático do Postgres, senhas definitivas.

## Como rodar e testar
- Node via Docker `node:24` (Node 22 quebra o `npm ci`): `docker run --rm --network host -u $(id -u):$(id -g) -e HOME=/tmp -v $PWD:/app -w /app node:24 <cmd>`, dentro de `backend/` ou `frontend/`.
- `npm test` (Vitest), `npm run lint`, `npm run build`. Última contagem: backend **404**, frontend **255**. Não há teste automatizado contra banco real (só fakes).
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
