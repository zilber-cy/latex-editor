#!/usr/bin/env bash
set -euo pipefail

if [[ "${SHARELATEX_IS_SERVER_PRO:-null}" == "true" ]]; then
  environment="server-pro"
else
  environment="server-ce"
fi

echo "Running migrations for $environment"
cd /overleaf/services/web
npm run migrations -- migrate -t "$environment"
echo "Finished migrations"
