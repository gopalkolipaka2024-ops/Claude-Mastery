#!/usr/bin/env bash
# One-time Cloudflare setup, run by the owner after `npx wrangler login`.
# Creates the storage the site needs for staging and production, then prints the D1 ids to
# paste into wrangler.jsonc. Safe to rerun: existing resources are reported, not replaced.
#   cd web && bash scripts/cloudflare-setup.sh
set -euo pipefail
cd "$(dirname "$0")/.."

echo "== R2 buckets (page cache)"
for b in adams-shore-staging-cache adams-shore-cache; do
  npx wrangler r2 bucket create "$b" 2>&1 | grep -E "Created|already exists" || true
done

echo "== D1 databases (cache refresh tags)"
for d in adams-shore-staging-tags adams-shore-tags; do
  npx wrangler d1 create "$d" 2>&1 | grep -E "database_id|already exists" || true
done
echo
echo "Paste each database_id into wrangler.jsonc (top level = staging, env.production = production)."
echo
echo "== Next: secrets (asks for each value; nothing is stored in the repository)"
cat <<'NEXT'
For staging (repeat with --env production for production):
  npx wrangler secret put DATABASE_URL
  npx wrangler secret put DATABASE_URL_WRITE
  npx wrangler secret put POS_WEBHOOK_SECRET
  npx wrangler secret put REVALIDATE_TOKEN
  npx wrangler secret put SENTRY_DSN
  npx wrangler secret put RESEND_API_KEY        # contact form
  npx wrangler secret put TURNSTILE_SECRET_KEY  # contact form
  npx wrangler secret put CONTACT_TO
  npx wrangler secret put CONTACT_FROM
  npx wrangler secret put CF_ACCESS_TEAM_DOMAIN # admin sign-in
  npx wrangler secret put CF_ACCESS_AUD
  npx wrangler secret put ADMIN_EMAILS
Then follow web/docs/runbook.md, "First-time setup".
NEXT
