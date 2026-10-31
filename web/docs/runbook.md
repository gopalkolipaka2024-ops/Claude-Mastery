# Runbook

Short, practical steps for running the Adams Shore website. For anything not covered here, see
the detailed docs next to this file.

| I need to… | Go to |
| --- | --- |
| Put a change live | [Deploy](#deploy) |
| Undo a bad release | [Roll back](#roll-back) |
| Change a banner, deal, featured product or hours | [Update content](#update-content) |
| Fix "sync failed" or "degraded" alerts | [Fix a failed sync](#fix-a-failed-sync) |
| Recover lost or damaged data | [Restore the database](#restore-the-database) |
| Set everything up the first time | [First-time setup](#first-time-setup) |

## How it fits together

```
Bottle POS ──webhook / nightly sync──▶ Postgres (Neon) ──▶ Website (Cloudflare Workers)
                                            ▲                    │
                     Staff: /admin (Cloudflare Access) ──────────┘
```

| Environment | What it is | Address |
| --- | --- | --- |
| Preview | One per pull request, built automatically, link posted on the PR | `pr-<number>-adams-shore-staging.<account>.workers.dev` |
| Staging | The `main` branch, deployed automatically after every merge | `adams-shore-staging.<account>.workers.dev` |
| Production | The live site, deployed **only by hand** | the store's domain |

Previews and staging use the staging database and are hidden from search engines.

## Deploy

1. Open a pull request. GitHub runs every check (lint, types, tests, Lighthouse, accessibility,
   end-to-end), deploys a preview and posts its link on the pull request. Click through it.
2. Merge when everything is green. Staging updates automatically within a few minutes.
3. Check staging.
4. Put it live: GitHub → **Actions** → **Deploy** → **Run workflow**:
   - target: `production`
   - confirm: type the domain (for example `example.com`)

   An approver then clicks **Approve** on the run. Database migrations run, the site deploys,
   and the health check runs. **If the health check fails, the previous version is restored
   automatically.**

Production deploys stay switched off until the repository variable `PRODUCTION_ENABLED` is set
to `true` (Settings → Secrets and variables → Actions → Variables).

## Roll back

- **Fastest:** Cloudflare dashboard → **Workers & Pages** → `adams-shore` → **Deployments** →
  pick the last good version → **Rollback**. This takes effect in seconds.
- **Or from GitHub:** **Actions** → **Roll back** → **Run workflow**. Choose `production`, and
  leave "version" empty to go back one release.

A rollback restores the code only. If a release also changed the database, migrations only add,
so the older code keeps working; never delete columns in the same release that stops using them.

## Update content

Staff sign in at `https://<domain>/admin` with their email. Cloudflare sends a one-time code.
Only addresses in `ADMIN_EMAILS` get in.

| Task | Where | Notes |
| --- | --- | --- |
| Banner across the top | Announcements | Optional start/end dates; shows immediately |
| Deals | Deals | Pick products by name, set start and end. Check each against invoice cost (MA rule 204 CMR 2.04). |
| Featured products on the home page | Featured | Order matters |
| Opening hours, holiday hours | Hours | Also updates the store details that search engines read from the site |

Prices, stock and product names come from the register (Bottle POS). Change them there, never on
the website: the next sync would overwrite website edits.

To add a staff member: add their email to the `ADMIN_EMAILS` secret
(`npx wrangler secret put ADMIN_EMAILS --env production`) and to the Cloudflare Access policy.

## Fix a failed sync

You'll know from any of these:
- the email from GitHub ("Catalog sync failed");
- a Sentry alert tagged `source:sync`;
- the uptime monitor reporting `degraded`.

The site keeps showing the last good data, so nothing is broken for customers.

1. **Read the error.** Look at the admin dashboard → *Recent syncs* → the Error column, or
   GitHub → Actions → **Catalog sync** → the failed run's log (JSON lines; the `level: "error"`
   line says why).
2. **Match the cause:**

   | Error says | Do this |
   | --- | --- |
   | `Refusing to hide N of M products` | The register's export is probably incomplete. Export again and re-run. If the store really dropped that many items, re-run once with `--allow-mass-deactivate` (below). |
   | `validation failed` | Some rows are malformed; the log lists the first five with their SKUs. Fix them in Bottle POS, then re-run. |
   | `duplicate skus in feed` / `feed has no items` | Bad export file. Export again. |
   | `site revalidate failed` | Data is saved but pages didn't refresh. Check `REVALIDATE_TOKEN` matches on the site and in GitHub, then re-run. Pages also refresh on their own within an hour. |
   | Connection / timeout errors | Check Neon's status page. Re-run when it's back. |
3. **Re-run:** Actions → **Catalog sync** → **Run workflow**. Or from a computer:
   `cd web && DATABASE_URL_WRITE=... npm run sync -- --source export` (add `--dry-run` first to
   check without writing).
4. **Confirm:** `https://<domain>/api/health` shows `"status":"ok"`.

Webhook failures (live price and stock updates from the register) show in Sentry with tag
`source:webhook`. The register retries; the nightly sync is the safety net either way.

## Restore the database

- **Mistake in the last few hours or days:** Neon console → the project → **Branches** →
  *Restore* to a point in time before the mistake. How far back you can go depends on the Neon
  plan; check *Settings → Storage → History retention*. Afterwards, run a full sync and
  redeploy, so caches refresh.
- **Older:** the weekly encrypted backup. GitHub → Actions → **Database backup** → a run →
  download `database-backup`, then:
  ```sh
  gpg -d -o db.dump adams-shore-<date>.dump.gpg     # asks for BACKUP_PASSPHRASE
  pg_restore --clean --if-exists --no-owner -d "$DATABASE_URL_OWNER" db.dump
  ```
  Then run a full sync and redeploy.

## Rotate a secret

If a key may have leaked, or a staff member with access leaves:
1. Generate a new value at the provider: Neon, Resend, Turnstile, Sentry, or a new random
   string for `POS_WEBHOOK_SECRET` and `REVALIDATE_TOKEN`.
2. `npx wrangler secret put <NAME> --env production`. Also update the same name in GitHub
   (Settings → Environments → production) if it's listed there, and in Bottle POS for the
   webhook secret.
3. Redeploy production, then revoke the old value at the provider.

## First-time setup

Do these once, in order. Nothing goes live until step 9.

1. **Cloudflare account** (free). Add the domain to Cloudflare, or buy it there.
2. **Neon** (free): create a project, then create the tables and the two site roles:
   `DATABASE_URL_OWNER=… READ_PASSWORD=… WRITE_PASSWORD=… npm run db:migrate -- --roles`.
   Load the catalog: `DATABASE_URL_WRITE=… npm run sync -- --source export`. Then make a
   `staging` branch of the database for staging and previews (details in
   [backend.md](backend.md#database-setup-neon-free-tier)).
3. **Cloudflare resources:** `npx wrangler login`, then `bash scripts/cloudflare-setup.sh`.
   Paste the printed D1 ids into `wrangler.jsonc`, then set the secrets it lists for staging
   and production.
4. **Cloudflare Access (admin login):**
   - Zero Trust → Access → Applications → add a self-hosted app for `<domain>/admin`, with a
     policy allowing the staff emails;
   - copy the team domain and audience tag into `CF_ACCESS_TEAM_DOMAIN` and `CF_ACCESS_AUD`;
   - also turn on *Access for workers.dev and preview URLs* in the Worker's settings, so
     staging and previews stay private.
5. **GitHub environments** (Settings → Environments): create `preview`, `staging` and
   `production`.

   | In each environment | Name | Value |
   | --- | --- | --- |
   | Secret | `CLOUDFLARE_API_TOKEN` | Cloudflare token with the "Edit Cloudflare Workers" template |
   | Secret | `DATABASE_URL` | Read role on that environment's Neon branch |
   | Secret | `DATABASE_URL_OWNER` | Owner role, used for migrations (staging, production) |
   | Variable | `CLOUDFLARE_ACCOUNT_ID` | Your Cloudflare account ID |
   | Variable | `SITE_URL` | `https://adams-shore-staging.<account>.workers.dev` for preview and staging; `https://<domain>` for production |
   | Variable | `CF_ANALYTICS_TOKEN` | Optional |
   | Variable | `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Optional |

   On `production`, add yourself as a **required reviewer**. Its secrets also need
   `BACKUP_PASSPHRASE` (for backups).

   Repository secrets used by the nightly sync and the uptime check: `DATABASE_URL_WRITE`,
   `SITE_URL`, `REVALIDATE_TOKEN`, `SENTRY_DSN`.
6. **Merge to `main`.** Staging deploys. Check it end to end, including `/admin`.
7. **Custom domain:**
   - uncomment `routes` under `env.production` in `wrangler.jsonc` with the real domain, both
     the bare name and `www`;
   - set `"workers_dev": false` there too, so the live site has only one address.

   The site 301-redirects whichever spelling isn't in `SITE_URL`. HTTPS is automatic. Also
   turn on *SSL/TLS → Edge Certificates → Always Use HTTPS*, with minimum TLS 1.2.
8. **Monitoring:**
   - Sentry project (DSN into `SENTRY_DSN`);
   - an UptimeRobot or Better Stack keyword monitor on `https://<domain>/api/health` expecting
     `"status":"ok"`;
   - Cloudflare Web Analytics.
9. **Go live:** set `PRODUCTION_ENABLED=true`, run **Deploy** with target `production`, then
   work through [launch-checklist.md](launch-checklist.md).

## Rate limits and abuse

The site limits each visitor:
- public API: 120 requests a minute;
- search suggestions: 300 a minute;
- error reports: 30 a minute;
- contact form: 20 a minute.

Each Cloudflare server counts separately, so also add one free **WAF rate-limiting rule**
(Security → WAF → Rate limiting rules): path starts with `/api/`, 100 requests per 10 seconds
per IP, action *Block* (the free plan blocks for 10 seconds at a time).
