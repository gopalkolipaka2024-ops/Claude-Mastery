# Adams Shore web (Next.js)

Browse-only store site. Architecture: [`../adr/0001-architecture.md`](../adr/0001-architecture.md).
Status: **built and tested, not live.** Every phase of the build is done; launching needs the owner's accounts
and data (see [`docs/launch-checklist.md`](docs/launch-checklist.md)).

| Read this | For |
| --- | --- |
| [`docs/runbook.md`](docs/runbook.md) | Deploy, roll back, update content, fix a failed sync, restore, first-time setup |
| [`docs/launch-checklist.md`](docs/launch-checklist.md) | Everything to do and check before and after going live |
| [`docs/backend.md`](docs/backend.md) | Data flow, database, POS sync, public API, admin |
| [`docs/performance.md`](docs/performance.md) · [`docs/seo.md`](docs/seo.md) · [`docs/accessibility.md`](docs/accessibility.md) | Budgets and how each is enforced |
| [`docs/security-and-compliance.md`](docs/security-and-compliance.md) | Headers, secrets, dependencies, privacy, alcohol rules to review |
| [`docs/observability.md`](docs/observability.md) | Tests, error tracking, uptime, logs, alerts |
| [`.env.example`](.env.example) | Every setting |

Hosting: Cloudflare Workers via the OpenNext adapter (`wrangler.jsonc`, `open-next.config.ts`), free plan.

## Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Local site at http://localhost:3000 |
| `npm run lint` | ESLint (Next.js core-web-vitals and TypeScript rules), zero warnings allowed |
| `npx opennextjs-cloudflare build && npx opennextjs-cloudflare preview` | The Cloudflare Workers build, served locally in Cloudflare's runtime at http://localhost:8787 (put settings in `.dev.vars`) |
| `npm run build` | Production build |
| `npm run typecheck` | TypeScript, no emit |
| `npm run tokens:check` | Checks every text/background token pair against WCAG 2.2 AA |
| `npm run storybook` | Component library at http://localhost:6006 |
| `npm run build-storybook && npm run test:a11y` | Builds Storybook and runs axe on every story (fails on any violation or broken story) |
| `npm run db:start` / `npm run db:migrate` / `npm run sync` | Local Postgres, apply migrations, full catalog sync (see docs/backend.md) |
| `npm test` | Unit and integration tests (set `TEST_DATABASE_ADMIN_URL` for the database tests) |
| `npm run catalog:import` | Rebuilds `src/data/catalog.json` from `../catalog.js` (the cleaned Bottle POS export) |
| `npm run build && npm start -- -p 3100`, then `npm run budget:js` | First-load JavaScript per key route (gzip), fails over 150 KB |
| `npm run build && npm run lhci` | Lighthouse CI on Home, Category, Search, Product: median of 5 mobile runs against the budgets in `lighthouserc.cjs` (see docs/performance.md) |
| `npm run build && npm start`, then `npm run test:pages` | Browser checks of every page type on desktop and phone: axe, headings, canonical, unique titles, JSON-LD, age gate, filters + Back, load more, autocomplete (SEO details: docs/seo.md) |
| `npm run build && npm start`, then `npm run test:keyboard` | Keyboard and interaction checks: skip link, visible focus, dialog focus traps, 44px tap targets, 320px reflow, reduced motion (see docs/accessibility.md) |
| `npm run build && npm run test:e2e` | Playwright end-to-end journeys and visual regression, desktop and phone (see docs/observability.md) |

## Pages

| Route | What it is |
| --- | --- |
| `/` | Home: hero, departments, game day picks (store's own flag), store info and map. Deals and featured sections appear when the store adds them. |
| `/c/[dept]`, `/c/[dept]/[aisle]` | Listings. Filters, sort and page live in the URL (`?aisle=…&pack=12+pk&sort=name-asc&page=2`). |
| `/search?q=` | Typo-tolerant search with synonyms (`src/config/synonyms.ts`) and "did you mean". |
| `/p/[slug]` | Product page with "Call to confirm", directions and details. Top 500 are pre-rendered. |
| `/deals`, `/store`, `/contact` | Active deals only, hours and directions, contact form (sending is switched on in Phase 3). |
| `/privacy`, `/terms`, `/accessibility`, `/responsible-drinking` | Drafts for the owner to review. |
| `/api/suggest?q=` | Autocomplete suggestions. |

## Data rules

Pages show only what the store's data has. With today's export (no prices, stock, brands or images) that means
"Call for price", no stock badge, no price/brand/country filters, and a drawn package instead of a photo.
Each appears automatically once the POS sync supplies it. Content (deals, announcements, featured, hours)
is edited in `/admin`; without a database it falls back to `src/content/site.json` and `src/config/store.ts`.

## Where things live

- `src/styles/tokens.css` — all design tokens (color, type, spacing, radius, shadow, motion, layers). Tailwind utilities are generated from it.
- `src/app/fonts.ts` + `src/app/fonts/` — the two self-hosted typefaces (SIL Open Font License).
- `src/config/store.ts` — store facts. Missing details are `null` and marked `TODO(owner)`; never guessed.
- `src/config/stock.ts` — stock badge thresholds (the only place to change them).
- `src/components/` — the component library. `src/stories/` — one story per component state.
- `src/lib/catalog.ts` — the only place pages read product data from (Phase 3 swaps in the database).
- `src/lib/listing.ts`, `src/lib/search.ts` — filtering, facet counts, sorting, search index.
- `src/lib/package-art.ts` — package drawings ported from the prototype.

Story prices and stock levels are examples for documenting states. The live site only shows prices and stock from the store's own data.
