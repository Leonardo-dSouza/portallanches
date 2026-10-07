#!/usr/bin/env bash
# Deploy da produção no servidor (o note da lanchonete): usa as imagens prontas do GHCR e sobe a pilha.
# Uso: deploy/deploy-prod.sh <commit>
#   - o CI roda depois da aprovação no environment `production`;
#   - no rollback, rode à mão com o commit antigo (ver docs/servidor-producao.md).
# Nunca monta imagem aqui: um build com os 2 núcleos a 100% derrubou o note (sessão 11).
set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# shellcheck source=deploy/lib/prod-common.sh
source "$REPO_DIR/deploy/lib/prod-common.sh"

readonly IMAGE_PREFIX="ghcr.io/leonardo-dsouza/portallanches"
readonly SERVICES=(migrate backend web)
# Tag que só existe no note e que o docker-compose.prod.yml usa. Não é `latest` porque o Compose
# sempre baixa de novo a `latest`, e aí um `up` à mão subiria uma versão que ninguém aprovou.
readonly DEPLOYED_TAG="deployed"
readonly BACKUP_DIR="$HOME/backups/portallanches"
readonly KEEP_BACKUPS=10
readonly KEEP_RELEASES=3
readonly API_WAIT_SECONDS=120

PARTIAL_DUMP=""
trap 'rm -f "$PARTIAL_DUMP"' EXIT

# Busca a main e devolve o commit completo (as imagens usam o sha de 40 caracteres na tag).
resolve_release() {
  git -C "$REPO_DIR" fetch --quiet origin
  git -C "$REPO_DIR" rev-parse --verify --quiet "${1}^{commit}" \
    || fail "commit não encontrado: '$1' (esperado: um commit da main já enviado ao GitHub)"
}

pull_if_missing() {
  local image="$1"
  if docker image inspect "$image" >/dev/null 2>&1; then
    echo "imagem já está no servidor: $image"
    return 0
  fi
  docker pull --quiet "$image" >/dev/null \
    || fail "não consegui baixar $image (esperado: imagem montada pelo CI no push desse commit, pacote público)"
  echo "imagem baixada: $image"
}

# Baixa tudo antes de mexer na pilha: se faltar alguma imagem, a prod continua como estava.
pull_release_images() {
  local sha="$1" service
  for service in "${SERVICES[@]}"; do
    pull_if_missing "$IMAGE_PREFIX-$service:$sha"
  done
}

backup_before_deploy() {
  local target
  target="$BACKUP_DIR/pre-deploy-$(date +%Y%m%d-%H%M%S)-${1:0:7}.dump"
  mkdir -p "$BACKUP_DIR"
  PARTIAL_DUMP="$target.partial"
  "$REPO_DIR/deploy/dump-prod-db.sh" >"$PARTIAL_DUMP" || fail "backup do banco falhou; deploy cancelado"
  require_pg_dump_file "$PARTIAL_DUMP"
  mv "$PARTIAL_DUMP" "$target"
  echo "backup: $target ($(du -h "$target" | cut -f1))"
  keep_newest_files "$BACKUP_DIR" 'pre-deploy-*.dump' "$KEEP_BACKUPS"
}

# Deixa o compose e os scripts iguais aos da versão (no rollback, volta para os antigos).
checkout_release() {
  git -C "$REPO_DIR" reset --quiet --hard "$1"
  echo "código no commit $1"
}

show_failure_logs() {
  echo "--- últimas linhas do migrate e do backend ---" >&2
  prod_compose logs --tail 50 migrate backend >&2 || true
}

start_release() {
  local sha="$1" service
  for service in "${SERVICES[@]}"; do
    docker tag "$IMAGE_PREFIX-$service:$sha" "$IMAGE_PREFIX-$service:$DEPLOYED_TAG"
  done
  # Se a migration falhar, o compose para aqui e o backend antigo continua de pé.
  if ! prod_compose up -d --no-build; then
    show_failure_logs
    fail "o docker compose up falhou com o commit $sha"
  fi
}

api_url() {
  local port
  port="$(grep -E '^WEB_PORT=' "$REPO_DIR/.env.prod" | cut -d= -f2 || true)"
  echo "http://localhost:${port:-18480}/api/"
}

wait_for_api() {
  local url deadline=$((SECONDS + API_WAIT_SECONDS))
  url="$(api_url)"
  until curl -fsS -o /dev/null "$url"; do
    if ((SECONDS >= deadline)); then
      show_failure_logs
      fail "a API não respondeu 200 em ${API_WAIT_SECONDS}s ($url)"
    fi
    sleep 2
  done
  echo "API respondendo: $url"
}

# Guarda as imagens dos últimos deploys para o rollback não depender do GitHub.
# Apagar a tag de uma imagem em uso só tira o nome: a tag `deployed` segura a imagem.
prune_service_releases() {
  local repo="$IMAGE_PREFIX-$1" tag
  docker images --format '{{.Tag}}' "$repo" | grep -E '^[0-9a-f]{40}$' | tail -n +"$((KEEP_RELEASES + 1))" \
    | while read -r tag; do docker rmi "$repo:$tag" >/dev/null; done
}

prune_old_releases() {
  local service
  for service in "${SERVICES[@]}"; do
    prune_service_releases "$service"
  done
  docker image prune -f >/dev/null
}

main() {
  local sha
  require_commit_ref "${1:-}"
  sha="$(resolve_release "$1")"
  echo "deploy do commit $sha"
  pull_release_images "$sha"
  backup_before_deploy "$sha"
  checkout_release "$sha"
  start_release "$sha"
  wait_for_api
  prune_old_releases
  echo "deploy concluído: $sha"
}

# Numa linha só: o checkout troca este arquivo no meio da execução e o bash lê o script aos pedaços.
main "$@"; exit $?
