#!/bin/bash
# Prepares cloud sessions: installs dependencies for the app and the CMS, and creates
# cms/.env with throwaway secrets. Does nothing on a local machine. Idempotent.
set -euo pipefail

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "${CLAUDE_PROJECT_DIR:-$(pwd)}"

node_major="$(node -p "process.versions.node.split('.')[0]")"
if [ "$node_major" -gt 24 ]; then
  echo "warning: Node $node_major detected; the tests and Strapi are verified on Node 22." >&2
fi

npm install --no-audit --no-fund --prefer-offline

if [ -f cms/package.json ]; then
  (cd cms && npm install --no-audit --no-fund --prefer-offline)

  if [ ! -f cms/.env ] && [ -f cms/.env.example ]; then
    secret() { openssl rand -base64 24 | tr -d '\n/+=' ; }
    sed \
      -e "s|^APP_KEYS=.*|APP_KEYS=$(secret),$(secret),$(secret),$(secret)|" \
      -e "s|^API_TOKEN_SALT=.*|API_TOKEN_SALT=$(secret)|" \
      -e "s|^ADMIN_JWT_SECRET=.*|ADMIN_JWT_SECRET=$(secret)|" \
      -e "s|^TRANSFER_TOKEN_SALT=.*|TRANSFER_TOKEN_SALT=$(secret)|" \
      -e "s|^ENCRYPTION_KEY=.*|ENCRYPTION_KEY=$(secret)|" \
      -e "s|^JWT_SECRET=.*|JWT_SECRET=$(secret)|" \
      -e "s|^FORMS_PROXY_SECRET=.*|FORMS_PROXY_SECRET=$(secret)|" \
      cms/.env.example > cms/.env
    echo "Created cms/.env with generated secrets."
  fi
fi
