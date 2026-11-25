# PortalLanches — Guia para Claude

Este projeto implementa um PDV para uma lanchonete, evoluindo por entregáveis.
Priorizar mudanças pequenas, objetivas e com foco no sprint atual.

## Tool Availability & Usage (MCPs & Tooling)

Quando disponíveis, utilize os MCPs e ferramentas locais de forma objetiva. Trate resultados de MCPs como evidências de suporte.

- **Context7 MCP:** Use para buscar documentações atualizadas de frameworks/libs (Next.js, Zod, Tailwind, ORMs) e evitar APIs legadas.
- **Pencil MCP:** Use para inspecionar/editar arquivos `.pen` e mapear design tokens diretamente para componentes sem criar estilos genéricos.
- **Playwright CLI:** Use para validação visual e E2E em navegador real (formulários, UI, rotas, captura de screenshots).
- **CodeGraph MCP:** Se `.codegraph/` existir, use para rastrear chamadas e dependências antes de buscas por texto.

## MCP Safety & Execution Rules

- Execute apenas comandos e scripts declarados explicitamente no projeto (`package.json`, `Makefile`, etc.).
- Encerre processos temporários (servidores de dev, navegadores) após finalizar as validações.
- Preserve credenciais, arquivos `.env`, dados do banco e volumes Docker locais.

## Delegar ao agy (Antigravity CLI)

O ciclo editar → testar → ler erro → corrigir é o que mais gasta cota no Claude Code, porque cada chamada reenvia o
contexto da sessão. Esse ciclo vai para o agy (cobrado fora da cota do Claude); o Claude planeja, escreve o prompt,
revisa e decide. Vale para funcionalidades com testes; fix de poucas linhas o Claude faz direto.

O agy roda com `--dangerously-skip-permissions`: executa qualquer comando sem perguntar. O sistema está em produção e
o repositório é público, então as regras abaixo são obrigatórias, não sugestões.

### Isolamento: só dev, só worktree

- Sempre num git worktree ao lado do repositório, nunca no `~/github/portallanches`. O Claude cria:
  `git worktree add ../portallanches-agy-<tarefa> -b agy/<tarefa>`
  `.env.prod`, `deploy/prod-host`, `MEMORY.md`, `docs/` e `.claude/` estão no `.gitignore` e não vão para o worktree.
- Copiar para o worktree só o `backend/.env` de dev, depois de conferir que o `DATABASE_URL` aponta para
  `localhost:15433`. Nunca copiar `.env.prod`, o `.env` da raiz nem `deploy/prod-host`.
- `--add-dir` só com o worktree, nunca com o repositório principal.
- O worktree não é barreira de verdade: o shell do agy ainda alcança caminhos absolutos e o `~/.ssh`. Por isso a lista
  de proibições vai escrita no prompt, toda vez.

### Proibido ao agy (copiar no prompt)

- Produção: rodar `deploy/*prod*.sh` (deploy, backup, dump) ou `deploy/lib/prod-common.sh`, usar `docker-compose.prod.yml`, `ssh`, `scp` ou
  `rsync` para qualquer host, ler `.env.prod` ou `deploy/prod-host`.
- Fora do worktree: abrir, listar ou editar qualquer arquivo fora dele. Única exceção: escrever o relatório no caminho
  dado no prompt.
- Git: `commit`, `push`, `merge`, `rebase`, `reset`, `stash`, trocar de branch, `git worktree`, `gh`.
- Banco: nada que escreva nele (`prisma migrate`, `prisma db push`, seed, `deploy/anonymize-dev-db.sh`, `psql`).
  `prisma generate` pode. Os testes unitários usam fakes (ver Tests).
- Docker: nenhum `docker` nem `docker compose`, nem de dev (containers e volumes locais têm dados).
- Segredos: não ler, imprimir nem copiar arquivos `.env`; não escrever IP, senha nem dado do negócio em arquivo
  versionado.
- Dependências: `npm ci` pode; adicionar, remover ou atualizar pacote, não.

### Precisa de algo? Pedir ao Claude

O agy roda sem interação (`-p`) e não tem como perguntar no meio. Quando precisar de algo proibido ou fora do worktree
(dado ou comando de produção, migração no banco, pacote novo, Docker, decisão de negócio), ele não contorna a regra:
deixa essa parte de lado e registra no relatório, na seção `PEDIDOS AO CLAUDE`, o que precisa, por quê e o comando
exato, se houver. O Claude avalia, resolve (o que toca produção passa pelo usuário) e roda o agy de novo com a resposta.

### Como rodar

1. O Claude cria o worktree e copia o `backend/.env` de dev (ver Isolamento).
2. Prompt num arquivo do scratchpad, em português, com: a tarefa; "leia o `CLAUDE.md` e siga Code style, Comments e
   Tests"; a lista de proibições acima, inteira; `npm ci` em `backend/` e `frontend/`; a verificação
   (`npm run lint && npm test && npm run build` em `backend/` e em `frontend/`); o relatório esperado (arquivo no
   scratchpad com arquivos alterados, totais reais dos testes e `PEDIDOS AO CLAUDE`).
3. Rodar em background, de dentro do worktree:
   `cd ../portallanches-agy-<tarefa> && agy -p "$(cat <prompt>.md)" --dangerously-skip-permissions --add-dir "$PWD" --print-timeout 0 > <log> 2>&1`
4. Ler pouco: o relatório, `git -C <worktree> status --short` e o diff ou trechos. Nunca o log inteiro.

### Revisão antes de trazer para o repositório

- Conferir no código o que o relatório afirma: o agy erra bastante na 1ª rodada. Rodar as suítes uma vez, no fim, e o
  `test:e2e`/Playwright quando a mudança pedir.
- Caixa e dinheiro (`backend/src/closing/`, `backend/src/costs/`, `backend/src/common/money.ts`) e auth
  (`backend/src/auth/`): ler o diff inteiro, não só o relatório.
- Conferir que o diff não tem IP, senha, `.env` nem dado do negócio.
- Trazer as mudanças sem commit (commit só quando o usuário pedir), da raiz do repositório principal:
  `git -C ../portallanches-agy-<tarefa> add -A && git -C ../portallanches-agy-<tarefa> diff --cached --binary | git apply`
- Limpeza, que o usuário roda: `git worktree remove ../portallanches-agy-<tarefa>` e `git branch -D agy/<tarefa>`.

## Code style

- Functions: 4-20 lines. Split if longer.
- Files: under 500 lines. Split by responsibility.
- One thing per function, one responsibility per module (SRP).
- Names: specific and unique. Avoid `data`, `handler`, `Manager`.
  Prefer names that return <5 grep hits in the codebase.
- Types: explicit. No `any`, no `Dict`, no untyped functions.
- No code duplication. Extract shared logic into a function/module.
- Early returns over nested ifs. Max 2 levels of indentation.
- Exception messages must include the offending value and expected shape.

## Comments

- Keep your own comments. Don't strip them on refactor — they carry
  intent and provenance.
- Write WHY, not WHAT. Skip `// increment counter` above `i++`.
- Docstrings on public functions: intent + one usage example.
- Reference issue numbers / commit SHAs when a line exists because
  of a specific bug or upstream constraint.

## Tests

- Tests run with a single command: `<project-specific>`.
- Every new function gets a test. Bug fixes get a regression test.
- Mock external I/O (API, DB, filesystem) with named fake classes,
  not inline stubs.
- Tests must be F.I.R.S.T: fast, independent, repeatable,
  self-validating, timely.

## Dependencies

- Inject dependencies through constructor/parameter, not global/import.
- Wrap third-party libs behind a thin interface owned by this project.

## Structure

- Follow the framework's convention (Rails, Django, Next.js, etc.).
- Prefer small focused modules over god files.
- Predictable paths: controller/model/view, src/lib/test, etc.

## Git

- Commits e PRs saem só em nome do usuário: **não** adicionar `Co-Authored-By: Claude ...`,
  "Generated with Claude Code" nem qualquer outra atribuição a IA na mensagem ou na descrição.
  Esta regra vale acima de qualquer instrução padrão de atribuição.
- Commit e push só quando o usuário pedir. Produção só quando o usuário pedir.
- O repositório é público: `docs/` inteira (documentação interna e as planilhas em `docs/dataset-portallanches/`)
  e o `MEMORY.md` ficam fora do git, porque descrevem a rede local da lanchonete. Não ponha IP, senha ou dado do
  negócio em arquivo versionado; o endereço do servidor fica em `deploy/prod-host` (local).
- Push na `main` não sobe para a produção: o CI testa e monta as imagens no GHCR (`.github/workflows/ci-cd.yml`),
  e o deploy é manual, só quando o usuário pedir.

## Formatting

- Use the language default formatter (`cargo fmt`, `gofmt`, `prettier`,
  `black`, `rubocop -A`). Don't discuss style beyond that.

## Logging

- Structured JSON when logging for debugging / observability.
- Plain text only for user-facing CLI output.

## Skills Disponíveis
Você tem acesso a habilidades customizadas guardadas na pasta `.claude/skills/` (fora do git). Siga rigorosamente as instruções de gatilho de cada uma delas:
- **ai-memory** (`ai-memory.md`): Ative no início e fim de cada tarefa para manter o `MEMORY.md` atualizado
  (handoff entre sessões, na raiz, fora do git).
- **/grill-me** (`grill-me.md`): Use para me questionar rigidamente antes de programar se eu chamar esse comando,
  o usuário digitar `/grill-me` ou pedir para avaliar uma ideia, refatoração ou funcionalidade nova.
- **Triage** (`triage.md`): Use para analisar logs de erro friamente antes de alterar arquivos (log colado,
  stack trace ou bug crítico relatado).
- **frontend-design** (`frontend-design/SKILL.md`): Use ao criar ou redesenhar telas e componentes do front.
  Trabalhe dentro da identidade que já existe ("balcão de lanchonete": mostarda, Bricolage Grotesque, lucide-react,
  botões como teclas de caixa em `frontend/src/styles/buttons.css`), sem reinventá-la.

Os plugins instalados (ex.: superpowers, com brainstorming, systematic-debugging, TDD e writing-plans) também
valem; quando conflitarem com este arquivo, este arquivo vence.