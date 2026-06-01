#!/usr/bin/env bash
set -euo pipefail
BASE_TOKEN="${1:-}"
if [[ -z "$BASE_TOKEN" ]]; then
  echo "Usage: $0 <base_token>" >&2
  exit 2
fi
NAME="${2:-Dashboard Page Preview POC}"
echo "Creating dashboard: $NAME" >&2
DASH_JSON=$(lark-cli base +dashboard-create --base-token "$BASE_TOKEN" --name "$NAME" --as user --json)
echo "$DASH_JSON"
DASH_ID=$(node -e 'const j=JSON.parse(process.argv[1]); console.log(j.dashboard_id||j.data?.dashboard_id||j.dashboard?.dashboard_id||"")' "$DASH_JSON")
if [[ -z "$DASH_ID" ]]; then echo "Cannot parse dashboard_id" >&2; exit 1; fi
lark-cli base +dashboard-block-create \
  --base-token "$BASE_TOKEN" \
  --dashboard-id "$DASH_ID" \
  --name "CLI Integration OK" \
  --type text \
  --data-config '{"text":"# Lark CLI OK\nDashboard created by lark-cli. Next: add custom page preview app URL."}' \
  --as user --json
