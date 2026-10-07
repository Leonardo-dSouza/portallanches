#!/usr/bin/env bash
# Escreve no stdout o dump do banco da produção (pg_dump -Fc). Roda no servidor.
# Uso: deploy/dump-prod-db.sh > arquivo.dump
# O backup antes do deploy (deploy-prod.sh) e o backup puxado pelo PC (backup-prod.sh) usam este script.
set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# shellcheck source=deploy/lib/prod-common.sh
source "$REPO_DIR/deploy/lib/prod-common.sh"

# As variáveis são do contêiner do banco, por isso as aspas simples.
# shellcheck disable=SC2016
prod_compose exec -T db sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc'
