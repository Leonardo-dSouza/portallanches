# Estado atual e próximos passos

Última atualização: 2026-09-19. Serve como ponto de retomada para a próxima sessão.

## Onde paramos

O planejamento do banco do Sprint 1 e o scaffold do backend estão prontos, mas **nada foi
commitado** e **nenhuma migration foi criada**.

- `docs/banco-de-dados.md`: modelo completo do Sprint 1 (7 tabelas, constraints, regras de negócio).
- `backend/`: projeto NestJS 12 (gerado com `@nestjs/cli`, `--strict`), com testes em Vitest e lint com oxlint.
- `backend/prisma/schema.prisma`: 7 models e 4 enums; passou em `prisma validate` e `prisma generate`.
- `backend/prisma.config.ts`: lê `DATABASE_URL` do ambiente (com valor padrão local).
- `backend/.env.example`: exemplo da `DATABASE_URL`.
- `.gitignore` (raiz): ignora `/backend/src/generated` (client do Prisma, recriado por `generate`).

## Por que parou

O computador atual (Windows 10) não tem Postgres nem Docker instalados. Sem banco não dá
para rodar `prisma migrate dev`, então a migration inicial e o seed ainda não existem.

## Decisões já tomadas

- Stack: NestJS + PostgreSQL + Prisma 7.10 (`prisma` pinado em `7.10` para não pular para a versão 8 rc).
- Backend fica em `backend/`; o frontend ainda não foi decidido.
- Formas de pagamento em tabela cadastrável; uma forma de pagamento por pedido.
- Taxa de entrega por bairro (`delivery_zones`), copiada para o pedido e sobrescrevível.
- Diária do motoboy em tabela com histórico (`motoboy_rate_settings`) e copiada para o fechamento.
- A lanchonete fecha na segunda: não existe fechamento nesse dia. Um único motoboy.
- Só o admin reabre um fechamento; o caixa só acessa o dia de hoje.

## Próximos passos

1. **Ter um Postgres disponível.** Opções: instalar o PostgreSQL no Windows, instalar o Docker
   Desktop, ou usar um Postgres gratuito na nuvem (Neon, Supabase). Copiar `backend/.env.example`
   para `backend/.env` e ajustar `DATABASE_URL`.
2. **Migration inicial:** `cd backend && npx prisma migrate dev --name init --create-only`, depois
   editar o SQL gerado para incluir as duas `CHECK` (listadas no topo do `schema.prisma`):
   - `orders`: se `type = 'COUNTER'`, então `delivery_zone_id IS NULL AND delivery_fee = 0`.
   - `daily_closings`: `EXTRACT(ISODOW FROM business_date) <> 1` (sem segunda-feira).
   Aplicar com `npx prisma migrate dev`.
3. **Seed** (`prisma/seed.ts`): usuário admin e caixa, formas de pagamento (PIX, dinheiro,
   maquininhas), valores da diária (ter–qui e sex–dom) e alguns bairros (ex.: Monterrey = 3,00).
4. **`PrismaService` no NestJS**, injetado por construtor (regra do `CLAUDE.md`), com teste usando
   fake class para o acesso ao banco.
5. **Módulos do Sprint 1**, um por vez: autenticação por perfil, fechamento diário, pedidos
   (com preenchimento automático da taxa pelo bairro), gastos e relatório por forma de pagamento.
6. Atualizar o `README.md` com como rodar o backend e link para este documento.

## Informações úteis

- **Instalar dependências:** use `npm ci --no-audit --no-fund` em `backend/`. O `npm audit` travou a
  instalação nesta máquina, e um `npm i` interrompido deixou o `node_modules` corrompido
  (erro `ENOTEMPTY`). Se acontecer de novo, apague `node_modules` e rode `npm ci`.
- **Prisma 7:** a URL do banco fica em `prisma.config.ts`, não no `schema.prisma`. Não usar
  `npx prisma` sem estar em `backend/` com dependências instaladas, senão o npx baixa a versão 8 rc.
- **Aviso do npm** sobre `install-scripts` (`prisma` e `@prisma/engines`): o CLI funciona mesmo
  assim; se falhar em outra máquina, rodar `npm install-scripts ls` e aprovar esses pacotes.
- **Bairro:** `delivery_zones.neighborhood_key` (minúsculas, sem acento) é gerado pela aplicação.
- **Regras do projeto:** ver `CLAUDE.md` (funções de 4 a 20 linhas, tipos explícitos, um teste por
  função nova, dependências injetadas).
- Nada foi commitado ainda. Ao commitar, incluir `backend/`, `docs/` e o `.gitignore` alterado.
