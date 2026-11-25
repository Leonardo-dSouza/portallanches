#!/usr/bin/env bash
# Sobe o nginx da imagem `web` (a do frontend/Dockerfile) com a config do repositório e confere os
# cabeçalhos de defesa, o cache da API e o ritmo do login (S-12, S-13 e S-06 do mapa de segurança).
# Uso: deploy/tests/web-headers.test.sh   (precisa de docker; o CI roda no job `scripts`)
set -uo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
readonly CONTAINER="portallanches-web-headers-test"
readonly PORT="18998"
readonly BASE_URL="http://127.0.0.1:$PORT"

WORK_DIR="$(mktemp -d)"
trap 'docker rm -f "$CONTAINER" >/dev/null 2>&1; rm -rf "$WORK_DIR"' EXIT
FAILED=0

# A imagem do nginx que a produção usa, lida do Dockerfile (sem montar o front).
nginx_image() {
  awk '/^FROM nginx/ { print $2 }' "$REPO_DIR/frontend/Dockerfile"
}

# Um index.html e um arquivo em /assets/ fazem o papel do front compilado.
start_web() {
  mkdir -p "$WORK_DIR/html/assets"
  echo '<!doctype html><title>teste</title>' >"$WORK_DIR/html/index.html"
  echo 'console.log(1)' >"$WORK_DIR/html/assets/app.js"
  docker run -d --rm --name "$CONTAINER" -p "127.0.0.1:$PORT:80" \
    --add-host backend:127.0.0.1 \
    -v "$REPO_DIR/frontend/nginx.conf:/etc/nginx/conf.d/default.conf:ro" \
    -v "$REPO_DIR/frontend/nginx-snippets:/etc/nginx/snippets:ro" \
    -v "$WORK_DIR/html:/usr/share/nginx/html:ro" \
    "$(nginx_image)" >/dev/null || return 1
  for _ in $(seq 1 30); do
    curl -fsS -o /dev/null "$BASE_URL/" && return 0
    sleep 1
  done
  return 1
}

# Cabeçalhos da resposta (em minúsculas), sem seguir redirecionamento.
headers_of() {
  curl -sS -o /dev/null -D - "$@" | tr -d '\r' | tr '[:upper:]' '[:lower:]'
}

# Ex.: expect_header "página" "$headers" "content-security-policy: default-src 'self'"
expect_header() {
  local name="$1" headers="$2" wanted="$3"
  if grep -qF -- "$wanted" <<<"$headers"; then
    echo "ok   - $name tem \"$wanted\""
    return 0
  fi
  echo "FAIL - $name sem \"$wanted\""
  FAILED=1
}

expect_no_header() {
  local name="$1" headers="$2" unwanted="$3"
  if ! grep -qF -- "$unwanted" <<<"$headers"; then
    echo "ok   - $name sem \"$unwanted\""
    return 0
  fi
  echo "FAIL - $name não devia ter \"$unwanted\""
  FAILED=1
}

test_defense_headers() {
  local path headers
  for path in / /caixa /assets/app.js /api/settings /api/live/events; do
    headers="$(headers_of "$BASE_URL$path")"
    expect_header "$path" "$headers" "content-security-policy: default-src 'self'"
    expect_header "$path" "$headers" "x-content-type-options: nosniff"
    expect_header "$path" "$headers" "x-frame-options: deny"
    expect_header "$path" "$headers" "permissions-policy: camera=()"
    expect_header "$path" "$headers" "cross-origin-opener-policy: same-origin"
    expect_no_header "$path" "$headers" "server: nginx/"
  done
}

test_cache() {
  expect_header "/api/settings" "$(headers_of "$BASE_URL/api/settings")" "cache-control: no-store"
  expect_header "/api/live/events" "$(headers_of "$BASE_URL/api/live/events")" "cache-control: no-store"
  expect_header "/assets/app.js" "$(headers_of "$BASE_URL/assets/app.js")" "cache-control: public, immutable"
}

# O stream do Caixa ao vivo (2026-11-24) não pode passar pelo buffer nem cair no timeout de 60 s do proxy.
test_live_stream_location() {
  local block
  block="$(docker exec "$CONTAINER" nginx -T 2>/dev/null | sed -n '/location = \/api\/live\/events/,/}/p')"
  expect_header "location do stream" "$block" "proxy_buffering off;"
  expect_header "location do stream" "$block" "proxy_read_timeout 1h;"
}

test_body_limit() {
  local status
  status="$(head -c 4000000 /dev/zero | curl -s -o /dev/null -w '%{http_code}' \
    -H 'content-type: application/json' --data-binary @- "$BASE_URL/api/expenses")"
  if [[ "$status" == 413 ]]; then
    echo "ok   - corpo de 4 MB na API: 413"
    return 0
  fi
  echo "FAIL - corpo de 4 MB na API: esperado 413, veio $status"
  FAILED=1
}

test_login_rate() {
  local statuses
  statuses="$(for _ in $(seq 1 30); do
    curl -s -o /dev/null -w '%{http_code}\n' -X POST "$BASE_URL/api/auth/login"
  done | sort | uniq -c)"
  if grep -q ' 429$' <<<"$statuses"; then
    echo "ok   - 30 logins seguidos: parte recebe 429 do nginx"
    return 0
  fi
  echo "FAIL - 30 logins seguidos sem nenhum 429: $statuses"
  FAILED=1
}

if ! start_web; then
  echo "FAIL - o nginx não subiu com a config do repositório"
  docker logs "$CONTAINER" 2>&1 | tail -20
  exit 1
fi
test_defense_headers
test_cache
test_live_stream_location
test_body_limit
test_login_rate
exit "$FAILED"
