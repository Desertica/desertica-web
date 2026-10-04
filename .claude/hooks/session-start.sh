#!/bin/bash
# Prepares cloud sessions: installs the app dependencies. Does nothing on a local machine.
# The CMS lives in its own repository (Desertica/desertica-cms) with its own session hook.
set -euo pipefail

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "${CLAUDE_PROJECT_DIR:-$(pwd)}"

node_major="$(node -p "process.versions.node.split('.')[0]")"
if [ "$node_major" -gt 24 ]; then
  echo "warning: Node $node_major detected; the tests are verified on Node 22." >&2
fi

npm install --no-audit --no-fund --prefer-offline
