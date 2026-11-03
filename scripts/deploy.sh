#!/usr/bin/env bash
# Ship to grandma-wei.pages.dev from this machine, using your Cloudflare login
# (run `wrangler login` once). Builds everything, deploys, then checks the
# live site answers. Secrets live on the Pages project, never in this repo:
#   wrangler pages secret put GROQ_API_KEY --project-name grandma-wei
set -euo pipefail
cd "$(dirname "$0")/.."
PROJECT=grandma-wei
W=apps/web/node_modules/.bin/wrangler

bun run build
(cd apps/web && ../../$W pages deploy dist --project-name "$PROJECT" --branch main --commit-dirty=true)

echo "Checking the live site…"
sleep 10
curl -fsS "https://$PROJECT.pages.dev/api/health"; echo
curl -fsS "https://$PROJECT.pages.dev/api/sample/traveler" | grep -q '"score":49' && echo "Practice reading: ok"
