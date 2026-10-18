#!/usr/bin/env bash
# Run the friends / row-level-security tests against a throwaway database.
# Uses the usual libpq settings (PGHOST, PGPORT, PGUSER, PGPASSWORD) for a
# Postgres server where you can create databases, e.g.
#   PGHOST=localhost PGUSER=postgres npm run test:db
set -euo pipefail
DB=belto_test
here="$(cd "$(dirname "$0")/.." && pwd)"

psql -d postgres -q -c "drop database if exists $DB" -c "create database $DB" 2>/dev/null
trap 'psql -d postgres -q -c "drop database if exists $DB"' EXIT
for f in supabase/tests/auth_stub.sql supabase/migrations/*.sql supabase/tests/friends_test.sql; do
  out="$(psql -d "$DB" -q -v ON_ERROR_STOP=1 -f "$here/$f" 2>&1)" || { echo "$out"; exit 1; }
  grep -oE "ok: .*|ALL FRIEND TESTS PASSED" <<<"$out" || true
done
