#!/usr/bin/env bash
# Apply SQL migrations using psql. Requires DATABASE_URL env var.

set -euo pipefail

if [ -z "${DATABASE_URL:-}" ]; then
  echo "DATABASE_URL is not set. Set DATABASE_URL to your Postgres connection string (e.g. from Supabase)."
  exit 1
fi

MIGRATIONS_DIR="$(dirname "$0")/../migrations"

echo "Applying migrations from $MIGRATIONS_DIR"

for f in $(ls "$MIGRATIONS_DIR"/*.sql | sort); do
  echo "--- applying $f"
  psql "$DATABASE_URL" -f "$f"
done

echo "All migrations applied."
