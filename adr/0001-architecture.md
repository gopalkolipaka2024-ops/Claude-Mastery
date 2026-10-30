# ADR 0001: Architecture for the Adams Shore browse-only store site

Status: **Proposed, waiting for approval**
Date: 2026-10-30

## 1. What exists today (audit)

| Area | Current state |
| --- | --- |
| Site | One static page, `src/store.html` (~1,600 lines, vanilla HTML/CSS/JS, no framework). Published as a private Claude artifact; `docs/` is a static copy for GitHub Pages (whether Pages is turned on is unverified). |
| Data source | `data/pos-export-raw.json`: a one-time Bottle POS stock export, 7,963 rows. `scripts/build_catalog.py` cleans it into `catalog.js` (7,380 products, 5 departments, 38 aisles). |
| Fields we have | Name, POS category, POS type, size text, one number per item (0–25,505; median 13; 1,888 zeros; called "popularity" so far, meaning unconfirmed), a game-day flag. |
| Fields we do **not** have | Price, sale price or dates, stock on hand, UPC/SKU, brand, ABV, region/country, varietal, description, images, created date ("newest" sort). |
| Images | Drawn package illustrations generated in the page. Open Food Facts photos were tried and rejected; Kroger API images ruled out by Kroger's terms (§5e). |
| Backend, database, auth | None. No API, no admin, no secrets. |
| Hosting/CI | GitHub repo; one GitHub Actions workflow (weekly product-photo rebuild, no longer used by the page). |
| Cost today | $0. |
| Spec conflicts in current site | It has a cart, pickup checkout and a deli sandwich builder; the new spec is browse-only. Some copy was written by me, not taken from store data, and must be confirmed or removed: deli sandwich descriptions and builder options, "Order by 11 am Sunday", the DoorDash/Uber Eats links (generic placeholders). |

**Consequence:** the spec says the site "reads product, price, category, and stock data from my app." That app/data feed does not exist yet. Price, stock badges, sale prices, specs, facets (brand, country, varietal, price range), "newest", deals and product detail pages all depend on fields we don't have. The rule "never invent products, prices, deals, or store details" means those parts stay empty until real data arrives. **Getting a live data feed from Bottle POS is the critical path for the whole project.**

## 2. Decisions

### 2.1 Stack
- **Next.js (App Router, TypeScript, server components) + Tailwind with design tokens.** Rewrite rather than extend `store.html`; the current page is a prototype with no build, routing or SEO-friendly pages. Its design work (brand, cooler, package art) carries over.
- **Search: client-side index, not a hosted search server.** At ~7,400 products a prebuilt index (Orama or MiniSearch, ~300–600 KB compressed, loaded on first search focus, cached) gives sub-50 ms results, typo tolerance and synonyms with $0 hosting. Move to Typesense/Meilisearch only if the catalog passes ~50k items or needs server-side relevance tuning.
- **Database: Postgres (Neon free tier)** for products, prices, stock, slugs, redirects and content (banners, deals, hours). Read-only role for the site; write role only for sync and admin.
- **Admin:** a small protected `/admin` in the same Next.js app (email magic-link via Auth.js, allow-list of staff emails) for banners, deals, featured products, hours, holiday hours, announcements. Saving triggers on-demand revalidation, so no code deploy.

### 2.2 Rendering per page type
| Page | Strategy |
| --- | --- |
| Home, Deals, Store info, Legal | Static + on-demand revalidation when content changes |
| Category / listing | Static for each category (first page); filter/sort state in URL, filtered client-side from the category's product data |
| Search results | Client-rendered from the search index (URL holds query + filters) |
| Product detail | Static per product, revalidated on price/stock change; unknown slugs 404, old slugs 301 |
| Admin, contact form endpoint | Server-rendered / serverless functions |

### 2.3 Data flow
Preferred: Bottle POS → webhook or API poll → sync job → Postgres → rebuild search index → revalidate changed pages. Safety net: nightly full resync.
Fallback if Bottle POS has no API: staff upload the POS export (CSV) in `/admin`; same pipeline runs from there.

### 2.4 Hosting and environments
- **Cloudflare (Pages/Workers via OpenNext) — recommended.** Free plan allows commercial sites, unlimited bandwidth, includes Turnstile and privacy-friendly Web Analytics.
- Alternative: **Vercel Pro ($20/month).** Simplest Next.js hosting; the free Hobby plan is non-commercial only, so a store can't use it.
- Environments: local → preview per pull request → staging (`staging.` subdomain) → production. One-click rollback via the host's deployment history.

### 2.5 Estimated monthly cost
| Item | Recommended (Cloudflare) | Alternative (Vercel) |
| --- | --- | --- |
| Hosting/CDN | $0 | $20 |
| Postgres (Neon free) | $0 (paid starts ~$19 if limits are hit) | $0 |
| Search (client-side) | $0 | $0 |
| Email for contact form (Resend free, 3,000/month) | $0 | $0 |
| Spam protection (Turnstile) | $0 | $0 |
| Analytics (Cloudflare Web Analytics; Plausible would be ~$9) | $0 | $0–9 |
| Error tracking (Sentry developer tier) | $0 | $0 |
| Uptime monitoring (free tier; check commercial-use terms) | $0 | $0 |
| Domain | ~$1 ($10–15/year) | ~$1 |
| **Total** | **~$1/month** | **~$21–30/month** |

Free tiers have limits and can change; each is re-checked before launch.

## 3. Risks
1. **No live data feed (blocker).** Without Bottle POS access the site can only show names and sizes. Prices, stock badges, deals and most facets stay off.
2. **Unknown meaning of the export's number column.** If it is lifetime units sold, it's usable for "popular"; it is not stock on hand.
3. **Product images.** Licensed photos need a source (distributor/brand portals, Bottle POS, or the store's own photos). Until then the drawn packages stay.
4. **Data quality.** Category assignments in the export were wrong for many items (re-sorted by rules in `build_catalog.py`); brand, ABV and region are absent.
5. **Alcohol advertising rules (Massachusetts).** Price display, "deals" wording and delivery mentions need a review against ABCC rules before launch. Flagged for the owner, not legal advice.
6. **Free-tier limits** (Neon compute hours, Cloudflare Worker CPU limits) could force a paid tier; budgeted above.
7. **Scope.** All nine phases is a multi-week project; budgets (Lighthouse 95+, JS < 150 KB) are achievable with this design but add CI time.

## 4. Open questions for the owner
1. Does your Bottle POS plan include an API, webhooks, or scheduled exports (CSV by email/SFTP)? Who is the account admin?
2. Can you export an item list with **price, sale price, quantity on hand, UPC, and vendor/brand**?
3. What does the number column in the current export mean (units sold, or on hand)? Over what period?
4. Stock badge thresholds: what counts as "Low stock" (for example, 1–5 units)?
5. Hosting: Cloudflare free (recommended) or Vercel Pro ($20/month)?
6. Domain: do you own one? Which?
7. Store email for the contact form, holiday hours, parking details, and the real DoorDash/Uber Eats store links.
8. Deli: should the deli board stay (browse-only, "call to order")? If so, the real sandwich names and ingredients.
9. Browse-only means removing the current cart and text-message pickup ordering. Confirm.
10. Product photos: which source will you pursue (distributor/brand portals, Bottle POS, own photos)?
