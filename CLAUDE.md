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

## Formatting

- Use the language default formatter (`cargo fmt`, `gofmt`, `prettier`,
  `black`, `rubocop -A`). Don't discuss style beyond that.

## Logging

- Structured JSON when logging for debugging / observability.
- Plain text only for user-facing CLI output.

## Skills Disponíveis
Você tem acesso a habilidades customizadas guardadas na pasta `.claude/skills/`. Siga rigorosamente as instruções de gatilho de cada uma delas:
- **ai-memory**: Ative no início e fim de cada tarefa para manter o `MEMORY.md` atualizado.
- **/grill-me**: Use para me questionar rigidamente antes de programar se eu chamar esse comando ou o usuário digitar `/grill-me`.
- **Triage**: Use para analisar logs de erro friamente antes de alterar arquivos.