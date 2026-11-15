#!/usr/bin/env bash
# Troca os dados pessoais do banco do DEV por falsos. Rode logo depois de clonar a produção no dev.
# Uso: deploy/anonymize-dev-db.sh
#   - clientes, pedidos, equipe, observações e motivos viram falsos (deploy/anonymize-dev-db.sql);
#   - todo ADMIN entra com admin123 e todo CAIXA com caixa123 (os hashes da produção somem).
# Por quê: o banco do dev é cópia da produção e a senha postgres/postgres está no repositório público;
# com o front na rede para testar no celular, qualquer um no Wi-Fi via os clientes (S-01, 2026-11-15).
# Nunca roda na produção: só aceita o banco do docker-compose.yml do dev, na porta 15433.
set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# shellcheck source=deploy/lib/prod-common.sh
source "$REPO_DIR/deploy/lib/prod-common.sh"

readonly DEV_DB_PORT="15433"

dev_compose() {
  docker compose -f "$REPO_DIR/docker-compose.yml" "$@"
}

require_dev_database() {
  local ports
  ports="$(dev_compose ps db --format '{{.Ports}}' 2>/dev/null || true)"
  [[ "$ports" == *":$DEV_DB_PORT->5432"* ]] \
    || fail "banco do dev fora do ar (esperado: 'docker compose up -d', porta $DEV_DB_PORT); este script não roda na produção"
}

# Mesmo formato de backend/src/auth/password-hasher.ts: salt:chave em hex, scrypt de 64 bytes.
# Ex.: dev_password_hash admin123
dev_password_hash() {
  # shellcheck disable=SC2016
  dev_compose exec -T backend node -e '
    const crypto = require("node:crypto");
    const salt = crypto.randomBytes(16);
    const key = crypto.scryptSync(process.argv[1], salt, 64);
    console.log(`${salt.toString("hex")}:${key.toString("hex")}`);
  ' "$1"
}

main() {
  local admin_hash caixa_hash
  require_dev_database
  admin_hash="$(dev_password_hash admin123)"
  caixa_hash="$(dev_password_hash caixa123)"
  dev_compose exec -T db psql -U postgres -d portallanches -v ON_ERROR_STOP=1 \
    -v admin_hash="$admin_hash" -v caixa_hash="$caixa_hash" <"$REPO_DIR/deploy/anonymize-dev-db.sql"
  echo "dev anonimizado: ADMIN entra com admin123 e CAIXA com caixa123"
}

main "$@"
