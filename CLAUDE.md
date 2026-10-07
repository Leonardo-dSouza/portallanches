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
- Push na `main` não sobe para a produção sozinho: o CI testa e monta as imagens, e o deploy espera a aprovação do
  usuário no environment `production` (`.github/workflows/ci-cd.yml`).

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