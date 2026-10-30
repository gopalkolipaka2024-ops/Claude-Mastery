# Backend: data, sync, API and admin

## How data flows

```
Bottle POS ──(signed webhook: price/stock changes)──▶ /api/webhooks/pos ─┐
           ──(nightly full export, GitHub Actions)──▶ npm run sync ──────┤
                                                                          ▼
                                                     Postgres (Neon) ── catalog version bumped
                                                                          │
           site (read-only role) ◀── in-memory snapshot, reloaded when the version changes
                                      changed product pages + home re-rendered right away
```

- **Matching:** items are matched by `sku` (the POS item ID). The current one-time export has no IDs, so it uses `name:<slug>` until a real export arrives. When it does, run one full sync with the new keys; old rows are hidden, new ones created.
- **Full sync** (`npm run sync`) writes only rows that changed, hides products that left the feed (never deletes), and gives renamed products a new URL with a 301 from the old one. Every run is logged in `sync_runs` and shown on `/admin`. A failed run rolls back completely.
- **Webhook** (`POST /api/webhooks/pos`) takes partial updates for up to 500 items: `{"items":[{"sku":"…","priceCents":2899,"saleCents":2599,"saleEndsAt":"2026-12-01","quantity":12}]}`. Sign it with `X-ASM-Timestamp: <unix seconds>` and `X-ASM-Signature: sha256=<hex HMAC-SHA256 of "<timestamp>.<body>" with POS_WEBHOOK_SECRET>`. Requests older than 5 minutes are rejected. Unknown SKUs are reported back, not created, unless they carry name, department and aisle.
- If Bottle POS can't send webhooks, a scheduled CSV export works: `npm run sync -- --source csv --file items.csv`. Columns are found by name (`src/sync/sources/bottle-pos-mapping.ts`); POS categories not in the map are listed in the run summary.

## Public API (read-only)

| Endpoint | Notes |
| --- | --- |
| `GET /api/v1/products` | `q`, `department`, `category`, `brand`, `pack`, `volume`, `country`, `varietal`, `min`, `max`, `stock=in`, `sort`, `page`, `limit` (≤100). Unknown parameters are rejected. |
| `GET /api/v1/products/:slug` | 301 for renamed products. |
| `GET /api/v1/categories` | Department → category tree with counts. |
| `GET /api/suggest?q=` | Autocomplete. |

Stock is returned only as `availability` (`in_stock`, `low_stock`, `out_of_stock`); counts never leave the server. Errors always look like `{"error":{"code","message","details?"}}`. Limits per IP per minute: 120 for `/api/v1`, 300 for suggestions, 20 contact-form posts (429 with `Retry-After`). On Cloudflare, also add a WAF rate-limit rule for `/api/*` so limits hold across server instances.

## Admin (`/admin`)

Announcements, deals (start/end dates; they hide themselves afterwards), featured products, weekly hours and holiday hours. Saving refreshes the whole site immediately; no deploy. Sale *prices* come from the POS, not the admin.

Protected by **Cloudflare Access** (free up to 50 users): Zero Trust → Access → Applications → add a self-hosted app for `yourdomain.com/admin*`, policy "Emails in" your staff list. Copy the team domain and the app's audience tag into `CF_ACCESS_TEAM_DOMAIN` and `CF_ACCESS_AUD`, and the same emails into `ADMIN_EMAILS`. The site verifies Cloudflare's signed token on every admin request and action.

## Database setup (Neon free tier)

1. Create a Neon project and database. Copy the owner connection string.
2. `DATABASE_URL_OWNER=… READ_PASSWORD=… WRITE_PASSWORD=… npm run db:migrate -- --roles`
3. Build `DATABASE_URL` (user `site_read`) and `DATABASE_URL_WRITE` (user `site_write`) from the same host with those passwords, and set them on the host and as GitHub secrets.
4. `DATABASE_URL_WRITE=… npm run sync -- --source export` loads the catalog.

Schema changes: edit `src/db/schema.ts`, run `npm run db:generate`, commit the new file in `src/db/migrations`, then `npm run db:migrate` before deploying.

## Local development

```sh
npm run db:start          # real Postgres on :54329 (leave running); writes .env.development.local
npm run sync              # load the catalog
npm run dev               # http://localhost:3000 ; add ADMIN_DEV_EMAIL=you@x to use /admin locally
TEST_DATABASE_ADMIN_URL=postgres://owner:owner@localhost:54329/postgres npm test
```
Running as root? Postgres refuses to; set `DEV_DB_DIR` to a folder the `postgres` user can reach (e.g. `/home/user/adams-dev-pg/db`).

Without `DATABASE_URL`, the site still runs from `src/data/catalog.json` (no prices, stock or admin).
