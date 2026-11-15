#!/usr/bin/env bash
# Testes das funções puras de deploy/lib/prod-common.sh (as que não falam com docker, git nem ssh).
# Uso: deploy/tests/prod-common.test.sh   (o CI roda no job `scripts`)
set -uo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
# shellcheck source=deploy/lib/prod-common.sh
source "$REPO_DIR/deploy/lib/prod-common.sh"

WORK_DIR="$(mktemp -d)"
trap 'rm -rf "$WORK_DIR"' EXIT
FAILED=0

# Roda num subshell (o `fail` encerra o processo) e compara com o esperado: pass ou fail.
# Ex.: expect fail "sha vazio" require_commit_ref ""
expect() {
  local expected="$1" name="$2" actual=pass
  shift 2
  ("$@") >/dev/null 2>&1 || actual=fail
  if [[ "$actual" == "$expected" ]]; then
    echo "ok   - $name"
    return 0
  fi
  echo "FAIL - $name (esperado $expected, veio $actual)"
  FAILED=1
}

test_require_commit_ref() {
  expect pass "sha curto" require_commit_ref 93e40bd
  expect pass "sha completo" require_commit_ref 6f75df4b2c0e0d8e3c5a1b7f9a2d4e6f8a0b1c3d
  expect fail "sha vazio" require_commit_ref ""
  expect fail "sha com 6 caracteres" require_commit_ref 93e40b
  expect fail "sha com maiúscula" require_commit_ref 93E40BD
  expect fail "nome de branch" require_commit_ref main
  expect fail "sha com 41 caracteres" require_commit_ref 6f75df4b2c0e0d8e3c5a1b7f9a2d4e6f8a0b1c3d0
}

test_require_pg_dump_file() {
  printf 'PGDMP\x01\x0e' >"$WORK_DIR/ok.dump"
  : >"$WORK_DIR/empty.dump"
  echo "pg_dump: error: connection refused" >"$WORK_DIR/error.dump"
  expect pass "dump com assinatura" require_pg_dump_file "$WORK_DIR/ok.dump"
  expect fail "dump vazio" require_pg_dump_file "$WORK_DIR/empty.dump"
  expect fail "mensagem de erro no lugar do dump" require_pg_dump_file "$WORK_DIR/error.dump"
  expect fail "arquivo que não existe" require_pg_dump_file "$WORK_DIR/missing.dump"
}

test_keep_newest_files() {
  local dir="$WORK_DIR/backups" remaining
  mkdir -p "$dir"
  touch "$dir"/pre-deploy-2026100{1,2,3,4}-120000-abc1234.dump "$dir/outro.txt"
  keep_newest_files "$dir" 'pre-deploy-*.dump' 2
  remaining="$(find "$dir" -mindepth 1 -printf '%f\n' | sort | tr '\n' ' ')"
  expect pass "guarda os 2 mais novos e não mexe no resto" \
    test "$remaining" == "outro.txt pre-deploy-20261003-120000-abc1234.dump pre-deploy-20261004-120000-abc1234.dump "
}

test_read_prod_host() {
  local host_file="$WORK_DIR/prod-host"
  printf 'usuario@10.0.0.5\nlinha extra\n' >"$host_file"
  expect pass "lê a 1ª linha do arquivo" test "$(PROD_HOST='' read_prod_host "$host_file")" == "usuario@10.0.0.5"
  expect pass "a variável vence o arquivo" test "$(PROD_HOST=outro@10.0.0.6 read_prod_host "$host_file")" == "outro@10.0.0.6"
  expect fail "sem variável e sem arquivo" env PROD_HOST= bash -c "source '$REPO_DIR/deploy/lib/prod-common.sh'; read_prod_host '$WORK_DIR/nada'"
}

# Permissão em octal (ex.: 700) de um arquivo ou pasta.
mode_of() {
  stat -c '%a' "$1"
}

test_private_backup_files() {
  local dir="$WORK_DIR/private/backups" old_dir="$WORK_DIR/old-backups" file
  ensure_private_dir "$dir"
  expect pass "pasta nova nasce 700" test "$(mode_of "$dir")" == 700
  mkdir -m 775 "$old_dir"
  ensure_private_dir "$old_dir"
  expect pass "pasta antiga (775) vira 700" test "$(mode_of "$old_dir")" == 700
  file="$dir/prod.dump.partial"
  create_private_file "$file"
  echo "dump" >"$file"
  expect pass "dump gravado com > continua 600" test "$(mode_of "$file")" == 600
  expect pass "o umask do script não muda" test "$(umask)" == "$ORIGINAL_UMASK"
}

test_require_main_commit() {
  local repo="$WORK_DIR/repo" main_sha side_sha
  git init -q -b main "$repo"
  git -C "$repo" -c user.name=t -c user.email=t@t commit -q --allow-empty -m main
  main_sha="$(git -C "$repo" rev-parse HEAD)"
  git -C "$repo" checkout -q -b lado
  git -C "$repo" -c user.name=t -c user.email=t@t commit -q --allow-empty -m lado
  side_sha="$(git -C "$repo" rev-parse HEAD)"
  expect pass "commit da main passa" require_main_commit "$repo" "$main_sha" main
  expect fail "commit de outro branch é recusado" require_main_commit "$repo" "$side_sha" main
  expect fail "commit que não existe é recusado" require_main_commit "$repo" 0000000 main
}

ORIGINAL_UMASK="$(umask)"
test_require_commit_ref
test_require_pg_dump_file
test_private_backup_files
test_require_main_commit
test_keep_newest_files
test_read_prod_host
exit "$FAILED"
