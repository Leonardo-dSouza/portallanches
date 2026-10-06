# Produção no servidor (o note da lanchonete)

Como a produção foi montada em 2026-10-06, os cuidados com a máquina e a operação do dia a dia.
Senhas (sistema, banco, sudo) **não** ficam aqui: o repositório é público.

## Resumo

| O quê | Onde |
| --- | --- |
| Sistema (rede local) | http://192.168.1.109:18480 |
| Acesso à máquina | `ssh leonardo@192.168.1.109` (chave SSH do PC de dev já instalada) |
| Código | `~/portallanches` (clone do GitHub) |
| Variáveis | `~/portallanches/.env.prod` (fora do git, `chmod 600`) |
| Banco | Postgres 17 no Docker, volume `portallanches-prod_pgdata_prod`, porta 15480 só em `127.0.0.1` |
| Usuários do sistema | `portallanches_admin` (admin) e `portallanches_caixa` (caixa) |

O PC de dev (192.168.1.113) continua com o ambiente de dev na 15173. A produção antiga que rodava nele
está desligada; o volume dela (`portallanches-prod_pgdata_prod` **no PC de dev**) ficou intacto e não é usado.

## A máquina

Notebook Dell antigo: Pentium T4300 (2 núcleos, 2009), 3,8 GB de RAM, 142 GB de disco, Debian 13 (trixie),
rede por cabo (`enp8s0`), **sem bateria** (só a fonte). Fuso America/Sao_Paulo com NTP sincronizado.

Cuidados que já foram feitos:

- **Tampa fechada não suspende:** `/etc/systemd/logind.conf.d/lid.conf` com `HandleLidSwitch=ignore`
  (e as variantes `ExternalPower` e `Docked`).
- **Suspensão desligada de vez:** mesmo com a tampa ignorada, o log mostrou o sistema suspendendo sozinho
  1 a 3 minutos depois de cada boot ("The system will suspend now!"). Servidor não pode dormir, então:
  `sudo systemctl mask sleep.target suspend.target hibernate.target hybrid-sleep.target suspend-then-hibernate.target`.
  Para desfazer: o mesmo comando com `unmask`.
- **Nunca fazer build no note.** No primeiro deploy, o `docker compose build` deixou os 2 núcleos em 100% e a
  máquina apagou em 2 minutos (05:39). O log do boot anterior (`journalctl -b -1`) termina no meio, sem nenhuma
  mensagem de desligamento: foi corte físico, não o sistema. Parada, a CPU fica em 28 °C (limite 105 °C).
  Sem bateria, o suspeito é a fonte não aguentar o pico ou o próprio Dell desligar por temperatura.
  Por isso as imagens são montadas em outro lugar e chegam prontas.

Ver temperatura: `for h in /sys/class/hwmon/hwmon*; do echo "$(cat $h/name)"; cat $h/temp*_input; done`
(valores em milésimos de °C).

## Como a produção foi montada (2026-10-06)

1. **Chave SSH:** `ssh-copy-id leonardo@192.168.1.109` a partir do PC de dev.
2. **Docker:** instalado pelo repositório oficial (`download.docker.com/linux/debian`, `trixie`):
   `docker-ce`, `docker-ce-cli`, `containerd.io`, `docker-buildx-plugin`, `docker-compose-plugin`.
   O usuário `leonardo` entrou no grupo `docker` e o serviço sobe no boot (`systemctl enable docker`).
3. **Código:** `git clone https://github.com/Leonardo-dSouza/portallanches.git ~/portallanches`.
4. **`.env.prod`** criado no próprio servidor, com uma senha de banco nova (32 letras e números, porque ela vai
   dentro de uma URL), `WEB_PORT=18480`, `DB_PORT=15480` e `BUSINESS_TIMEZONE=America/Sao_Paulo`:
   ```bash
   tr -dc 'A-Za-z0-9' </dev/urandom | head -c 32   # gera a senha do banco
   ```
5. **Imagens montadas no PC de dev** e enviadas pela rede (as tags são as que o compose espera):
   ```bash
   # no PC de dev, na raiz do repositório
   docker build --target migrate -t pl-deploy/migrate:<sha> backend
   docker build --target runtime -t pl-deploy/backend:<sha> backend
   docker build -t pl-deploy/web:<sha> frontend
   docker save pl-deploy/migrate:<sha> pl-deploy/backend:<sha> pl-deploy/web:<sha> \
     | gzip -1 | ssh leonardo@192.168.1.109 'gunzip | docker load'
   # no servidor
   for s in migrate backend web; do docker tag pl-deploy/$s:<sha> portallanches-prod-$s:latest; done
   ```
6. **Banco: cadastro do dev, sem movimento.** Um banco zerado (migrations + seed + importação das planilhas)
   perderia a revisão dos insumos feita na lanchonete (sessão 9): a migration
   `20261002120000_supply_daily_count_cleanup` só corrige insumos que **já existem**, e num banco novo ela roda
   antes de qualquer insumo nascer. Então o banco de dev foi copiado e o movimento foi apagado:
   ```bash
   # no PC de dev
   docker compose exec -T db sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc --no-owner --no-acl' > dev-cadastro.dump
   # no servidor (só o banco no ar)
   docker compose --env-file .env.prod -f docker-compose.prod.yml up -d db
   docker compose --env-file .env.prod -f docker-compose.prod.yml exec -T db \
     pg_restore -U portallanches -d portallanches --no-owner --no-acl --exit-on-error < dev-cadastro.dump
   ```
   ```sql
   BEGIN;
   TRUNCATE order_items, orders, expenses, daily_closings, customers,
            stock_movements, stock_lots, stock_counts RESTART IDENTITY;
   UPDATE users SET username = 'portallanches_admin', name = 'portallanches_admin', updated_at = NOW()
   WHERE id = 1 AND username = 'admin';
   UPDATE users SET username = 'portallanches_caixa', name = 'portallanches_caixa', updated_at = NOW()
   WHERE id = 2 AND username = 'caixa';
   COMMIT;
   ```
   Ficou: 94 produtos ativos, 147 insumos (com seções, embalagens e custos), bairros, pagamentos, tipos de gasto,
   diária do motoboy e as 17 migrations. Zero fechamentos, pedidos, gastos, clientes, lotes e contagens: o
   estoque começa vazio (a primeira contagem preenche).
   - Pegadinha: na **primeira** subida o Postgres liga um servidor temporário para inicializar o banco e o
     desliga em seguida. Um `pg_isready` pode pegar esse temporário ("the database system is shutting down").
     Espere aparecer `init process complete` em `logs db` antes de restaurar.
7. **Usuários:** a API não troca o nome de usuário (`PUT /users/:id` só muda nome, perfil e ativo), por isso o
   `username` foi trocado no SQL acima. As senhas foram trocadas pela API, que gera o hash do jeito certo:
   `POST /api/users/:id/password` com `{"newPassword": "..."}` (só admin; vale também para o próprio admin).
8. **Subida:** `docker compose --env-file .env.prod -f docker-compose.prod.yml up -d --no-build`
   (o `migrate` respondeu "No pending migrations").
9. **Conferido:** login com as senhas novas = 200; `admin123`, `caixa123` e o usuário `admin` = 401; o front
   abre pela rede (200) e o caixa entra direto na tela de pedidos, vazia.

## Operação do dia a dia (no servidor, em `~/portallanches`)

```bash
alias pl='docker compose --env-file .env.prod -f docker-compose.prod.yml'
pl ps                          # o que está de pé
pl logs -f backend             # log da API
pl restart backend             # reiniciar (desloga todo mundo: as sessões ficam na memória)
pl exec -T db pg_dump -U portallanches -Fc portallanches > ~/backup-$(date +%F).dump   # backup manual
```

Restaurar um backup (apaga o que está no banco):

```bash
pl stop backend web
pl exec -T db pg_restore -U portallanches -d portallanches --clean --if-exists --no-owner --no-acl < arquivo.dump
pl start backend web
```

Tudo sobe sozinho quando a máquina liga (`restart: unless-stopped` e Docker habilitado no boot).

## Ambientes: dev, staging e homologação

- **Dev (desenvolvimento):** onde se programa. Aqui é o PC de dev na 15173, com recarga automática e dados
  que podem ser bagunçados. Pode estar quebrado no meio de uma tarefa.
- **Staging:** uma cópia fiel da produção (mesma infra, mesmo jeito de fazer deploy, mesmas migrations), mas
  sem cliente de verdade. Serve para validar a parte **técnica** antes de ir ao ar: se o build, a migration e o
  deploy funcionaram no staging, vão funcionar na produção.
- **Homologação:** a validação do **negócio**. O cliente ou o dono testa e diz "é isso que eu pedi, pode
  liberar"; homologar é aprovar. Muitas empresas brasileiras chamam o ambiente de staging de "homologação",
  porque o mesmo ambiente costuma servir para as duas coisas. A diferença está no foco: staging é a conferência
  técnica, homologação é o aceite de quem pediu.
- **Produção:** o que a lanchonete usa.

No PortalLanches, por enquanto, dev + produção bastam: o dono homologa no dev antes do commit. Se um dia fizer
falta, um staging cabe no mesmo servidor sem custo: outro projeto do compose em outra porta (ex.: 18481), com
banco próprio, atualizado por uma branch `staging`.
