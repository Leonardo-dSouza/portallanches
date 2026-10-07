#!/usr/bin/env bash
# Puxa um backup do banco da produção para este PC. Você roda à mão, com o note ligado.
# Uso: deploy/backup-prod.sh [pasta]
#   pasta padrão: ~/backups/portallanches-prod; outro servidor: PROD_HOST=usuario@ip deploy/backup-prod.sh
# Restaurar: ver "Restaurar um backup" em docs/servidor-producao.md.
set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# shellcheck source=deploy/lib/prod-common.sh
source "$REPO_DIR/deploy/lib/prod-common.sh"

readonly PROD_HOST="${PROD_HOST:-leonardo@192.168.1.109}"
# Caminho relativo à pasta pessoal: o ssh já começa nela.
readonly REMOTE_DUMP_SCRIPT="portallanches/deploy/dump-prod-db.sh"

PARTIAL_DUMP=""
trap 'rm -f "$PARTIAL_DUMP"' EXIT

main() {
  local dest_dir="${1:-$HOME/backups/portallanches-prod}" target
  mkdir -p "$dest_dir"
  target="$dest_dir/prod-$(date +%Y%m%d-%H%M%S).dump"
  PARTIAL_DUMP="$target.partial"
  echo "baixando o banco de $PROD_HOST..."
  ssh -o ConnectTimeout=10 "$PROD_HOST" "$REMOTE_DUMP_SCRIPT" >"$PARTIAL_DUMP" \
    || fail "o dump em $PROD_HOST falhou (o note está ligado? o deploy pelo CI já levou $REMOTE_DUMP_SCRIPT?)"
  require_pg_dump_file "$PARTIAL_DUMP"
  mv "$PARTIAL_DUMP" "$target"
  echo "backup salvo: $target ($(du -h "$target" | cut -f1))"
}

main "$@"
