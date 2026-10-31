# Quality and observability

## Tests

| Layer | Command | What it covers |
| --- | --- | --- |
| Unit | `npm test` | Price, sale and stock-badge logic, listing filters and sorting, search rules, SEO and structured data, security headers, webhook signatures, error reporting, the health endpoint |
| Integration | `npm test` with `TEST_DATABASE_ADMIN_URL` set | The public API, plus the sync against a real throwaway Postgres: creates, updates, renames with redirects, hiding products, rollback on failure, and the mass-hide safety limit |
| End-to-end (Playwright) | `npm run build && npm run test:e2e` | Age gate, search (suggestions, keyboard, synonyms, empty results), filters/sort/load more with Back, the phone filter sheet, product page and 404, contact form errors and submit. Desktop and phone. |
| Visual regression | part of `test:e2e` | The top of home, category, search, product and store pages on desktop and phone, with the clock frozen. Fails on a change beyond 2% of pixels. |
| Accessibility | `test:pages`, `test:keyboard`, `test:a11y` | axe on every page type and Storybook story, plus keyboard, focus, dialog, tap-target and reflow checks (docs/accessibility.md) |
| Performance | `npm run lhci`, `npm run budget:js` | Lighthouse budgets and first-load JS (docs/performance.md) |

All of these run in the **Web quality** workflow on every pull request. The integration tests
get a throwaway Postgres service there.

**After an intended visual change:** run `npm run test:e2e -- --update-snapshots` and commit
the new images in `e2e/__screenshots__`. If GitHub's machines render slightly differently,
run the Web quality workflow by hand with "update_snapshots" ticked, download the
`screenshot-baselines` artifact, and commit those images instead.

## Speed in the real world (field data)

Lighthouse in CI is a lab test, and its simulated phone timings vary from run to run. The
measure that matters (and that Google uses for ranking) is what real visitors experience.
**Cloudflare Web Analytics** reports this: turn it on with `CF_ANALYTICS_TOKEN`, then open
*Web Analytics → Core Web Vitals* in the Cloudflare dashboard. It shows LCP, INP and CLS per page
from real visits, with no cookies. Targets: LCP under 2.5 s, INP under 200 ms, CLS under 0.1
for at least 75% of visits. Google Search Console's *Core Web Vitals* report shows the same
once the site has enough traffic.

## Error tracking (Sentry)

- **What is reported:**
  - every uncaught server error: pages, API routes, form actions and the proxy (`src/instrumentation.ts`);
  - browser errors, through a 1 KB inline beacon and the error pages, sent to `/api/client-errors`
    (rate-limited to 30 a minute per visitor);
  - webhook failures;
  - every failed catalog sync.
- **What is never sent:** cookies, headers, query strings or form contents. Only the path, the
  method and the error itself are sent.
- **No Sentry SDK:** events go to Sentry's HTTP API (`src/lib/error-report.ts`). It works on
  Node and Cloudflare, adds nothing to the browser bundle, and sends at most 30 events a minute
  per server.
- **Setup (free Developer plan, 5,000 errors a month):**
  1. Create a Sentry project with platform "JavaScript".
  2. Copy its DSN into `SENTRY_DSN` on the host, and into GitHub secrets for the nightly sync.
  3. In Sentry, under Alerts, create these alert rules:
     - "A new issue is created" → email.
     - "Number of events > 0 in 1 hour where tag `source` equals `sync`" → email.

Without `SENTRY_DSN`, errors are still written to the logs.

## Uptime

`GET /api/health` returns JSON:
- **200 `"status":"ok"`:** everything works.
- **200 `"status":"degraded"`:** the site works, but the last successful catalog sync is
  older than `SYNC_STALE_HOURS` (36 hours by default), or the latest sync failed.
- **503 `"status":"down"`:** the catalog can't be loaded or the database doesn't answer.

**Primary monitor:** a free UptimeRobot or Better Stack account (check their commercial-use
terms). Create a *keyword* monitor on `https://<domain>/api/health` that expects
`"status":"ok"`, checks every 5 minutes, and sends alerts to the owner's email or phone. One
monitor covers both "site down" and "sync stuck".

**Backup:** the **Uptime** GitHub workflow checks the same URL every 15 minutes once the
`SITE_URL` repository secret is set. A failed run emails the repo owner.

## Logs

Server code, the webhook and the sync job write one JSON object per line (`src/lib/log.ts`):

```json
{"time":"2026-10-31T15:53:33.101Z","level":"info","msg":"sync ok","service":"sync","source":"export","ms":6963,"runId":12,"created":0,"updated":7380,"deactivated":0,"unchanged":0}
```

Where to find them:
- **Site:** the host's log viewer (Cloudflare: Workers → Logs; Vercel: Logs). Filter by `level`,
  `msg` or `service`.
- **Nightly sync:** the Catalog sync run in GitHub Actions.
- **Every sync** (nightly, webhook or manual): the `sync_runs` table, shown under *Recent syncs*
  on the admin dashboard.

## Sync alerts

A failed sync is caught three ways:
- the nightly workflow goes red and GitHub emails the owner;
- a Sentry alert fires (tag `source:sync`);
- `/api/health` turns `degraded`, so the uptime monitor alerts.

**Safety limit:** a full sync may hide at most 20% of the active catalog (and at least 25
items) in one run. A larger change, such as a truncated or empty export from the register, is
refused, nothing is changed, and an alert is sent. After checking the feed, rerun with
`--allow-mass-deactivate` if the change is real.
