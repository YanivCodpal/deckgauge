#!/bin/sh
set -e

IMPORT_FILE="/opt/keycloak/data/import/realm.json"
WORK_FILE="/tmp/realm.json"

# Copy to writable location — the bind-mounted directory is not writable,
# so sed -i and jq temp files would fail there.
cp "$IMPORT_FILE" "$WORK_FILE"

if [ -n "$MICROSOFT_CLIENT_ID" ] && [ -n "$MICROSOFT_CLIENT_SECRET" ] && [ -n "$MICROSOFT_TENANT_ID" ]; then
  echo "Configuring Microsoft Entra ID identity provider..."
  sed -i "s|__MICROSOFT_CLIENT_ID__|${MICROSOFT_CLIENT_ID}|g" "$WORK_FILE"
  sed -i "s|__MICROSOFT_CLIENT_SECRET__|${MICROSOFT_CLIENT_SECRET}|g" "$WORK_FILE"
  sed -i "s|__MICROSOFT_TENANT_ID__|${MICROSOFT_TENANT_ID}|g" "$WORK_FILE"
else
  echo "Microsoft SSO env vars not set — removing Microsoft IdP from realm config..."
  if command -v jq >/dev/null 2>&1; then
    jq 'del(.identityProviders, .identityProviderMappers)' "$WORK_FILE" > "${WORK_FILE}.tmp" \
      && mv "${WORK_FILE}.tmp" "$WORK_FILE"
  else
    echo "Warning: jq not available — stripping IdP config via sed fallback"
    sed -i '/"identityProviders"/,/^\s*\]/d' "$WORK_FILE"
    sed -i '/"identityProviderMappers"/,/^\s*\]/d' "$WORK_FILE"
  fi
fi

# Write processed config back to the import location
cat "$WORK_FILE" > "$IMPORT_FILE"

exec "$@"
