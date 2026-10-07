# shellcheck shell=bash
# Funções comuns dos scripts da produção, carregadas com `source`.
# Quem carrega define REPO_DIR (raiz do repositório) antes de usar `prod_compose`.

# Mostra o erro no stderr e encerra o script.
# Ex.: fail "dump vazio: /tmp/x.dump (esperado: saída do pg_dump -Fc)"
fail() {
  echo "erro: $*" >&2
  exit 1
}

# docker compose da pilha de produção, de qualquer pasta. Ex.: prod_compose ps
prod_compose() {
  docker compose --env-file "$REPO_DIR/.env.prod" -f "$REPO_DIR/docker-compose.prod.yml" "$@"
}

# Aceita só um commit escrito em hexadecimal, curto ou completo. Ex.: require_commit_ref 93e40bd
require_commit_ref() {
  local ref="${1:-}"
  [[ "$ref" =~ ^[0-9a-f]{7,40}$ ]] && return 0
  fail "commit inválido: '$ref' (esperado: 7 a 40 caracteres hexadecimais, ex.: 93e40bd)"
}

# Confere que o arquivo é um dump do pg_dump -Fc: não vazio e começando com "PGDMP".
# Ex.: require_pg_dump_file ~/backups/portallanches/pre-deploy.dump
require_pg_dump_file() {
  local file="$1"
  [[ -s "$file" ]] || fail "dump vazio: $file (esperado: saída do pg_dump -Fc)"
  [[ "$(head -c 5 "$file")" == "PGDMP" ]] || fail "dump inválido: $file (esperado: começar com PGDMP)"
}

# Endereço ssh do servidor (usuario@ip). O IP não vai para o git (o repositório é público): vem da
# variável PROD_HOST ou da 1ª linha do arquivo local (deploy/prod-host, no .gitignore).
# Ex.: host="$(read_prod_host "$REPO_DIR/deploy/prod-host")"
read_prod_host() {
  local host_file="$1"
  if [[ -n "${PROD_HOST:-}" ]]; then
    echo "$PROD_HOST"
    return 0
  fi
  [[ -s "$host_file" ]] || fail "servidor não configurado: crie $host_file com uma linha usuario@ip (ou defina PROD_HOST)"
  head -n 1 "$host_file"
}

# Apaga os arquivos mais antigos da pasta que casam com o padrão, guardando os N mais novos.
# Os nomes começam pela data (AAAAMMDD-HHMMSS), então a ordem alfabética é a ordem do tempo.
# Ex.: keep_newest_files ~/backups/portallanches 'pre-deploy-*.dump' 10
keep_newest_files() {
  local dir="$1" pattern="$2" keep="$3"
  find "$dir" -maxdepth 1 -type f -name "$pattern" | sort -r | tail -n +"$((keep + 1))" | xargs -r rm -f --
}
