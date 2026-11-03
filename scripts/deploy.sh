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

# The upload sometimes drops mid-request ("other side closed"); it's safe to retry,
# because files already uploaded are skipped.
for try in 1 2 3; do
  if (cd apps/web && ../../$W pages deploy dist --project-name "$PROJECT" --branch main --commit-dirty=true); then
    break
  fi
  if [ "$try" = 3 ]; then
    echo "Deploy failed three times. Check your connection, or run: bunx wrangler@latest pages deploy dist --project-name $PROJECT --branch main (from apps/web)" >&2
    exit 1
  fi
  echo "Upload dropped, trying again ($try of 3)…" >&2
  sleep 5
done

echo "Checking the live site…"
sleep 10
curl -fsS "https://$PROJECT.pages.dev/api/health"; echo
curl -fsS "https://$PROJECT.pages.dev/api/sample/traveler" | grep -q '"score":49' && echo "Practice reading: ok"
