#!/bin/bash
# Apply the ClickHouse analytics schema.
#
# Run after `docker compose up` to create the analytics tables.
#
# Applies every clickhouse/schemas/*.sql file in filename order against a
# running ClickHouse over the HTTP interface. Schemas use IF NOT EXISTS, so
# re-running is safe (idempotent). Mirrors the ch_query loop in
# scripts/deploy-staging.sh.
#
# Environment overrides:
#   CLICKHOUSE_USER      (default: cockpit)
#   CLICKHOUSE_PASSWORD  (default: cockpit)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

CLICKHOUSE_USER="${CLICKHOUSE_USER:-cockpit}"
CLICKHOUSE_PASSWORD="${CLICKHOUSE_PASSWORD:-cockpit}"
CH_URL="http://${CLICKHOUSE_USER}:${CLICKHOUSE_PASSWORD}@localhost:8123/"

SCHEMA_DIR="$PROJECT_ROOT/clickhouse/schemas"

if [ ! -d "$SCHEMA_DIR" ]; then
  echo "✗ No clickhouse/schemas/ directory found at $SCHEMA_DIR" >&2
  exit 1
fi

shopt -s nullglob
schema_files=("$SCHEMA_DIR"/*.sql)
shopt -u nullglob

if [ "${#schema_files[@]}" -eq 0 ]; then
  echo "✗ No .sql files found in $SCHEMA_DIR" >&2
  exit 1
fi

echo "Applying ClickHouse schemas from $SCHEMA_DIR ..."

# Apply in filename order (IF NOT EXISTS makes this idempotent).
IFS=$'\n' sorted_files=($(printf '%s\n' "${schema_files[@]}" | sort))
unset IFS

for sql_file in "${sorted_files[@]}"; do
  filename="$(basename "$sql_file")"
  echo "  → Applying $filename ..."
  if ! curl -sf --max-time 30 "$CH_URL" --data-binary "@$sql_file" > /dev/null; then
    echo "✗ Failed to apply $filename" >&2
    exit 1
  fi
  echo "  ✓ $filename"
done

echo "✓ All ClickHouse schemas applied."
