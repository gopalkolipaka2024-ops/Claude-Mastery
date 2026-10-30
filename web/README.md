# Adams Shore web (Next.js)

Browse-only store site. Architecture: [`../adr/0001-architecture.md`](../adr/0001-architecture.md).
Status: **Phase 3 (backend) done.** Database, POS sync and webhook, public API, admin and contact email.
Backend setup and operations: [`docs/backend.md`](docs/backend.md). Environment variables: [`.env.example`](.env.example).

## Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Local site at http://localhost:3000 |
| `npm run build` | Production build |
| `npm run typecheck` | TypeScript, no emit |
| `npm run tokens:check` | Checks every text/background token pair against WCAG 2.2 AA |
| `npm run storybook` | Component library at http://localhost:6006 |
| `npm run build-storybook && npm run test:a11y` | Builds Storybook and runs axe on every story (fails on any violation or broken story) |
| `npm run db:start` / `npm run db:migrate` / `npm run sync` | Local Postgres, apply migrations, full catalog sync (see docs/backend.md) |
| `npm test` | Unit and integration tests (set `TEST_DATABASE_ADMIN_URL` for the sync tests) |
| `npm run catalog:import` | Rebuilds `src/data/catalog.json` from `../catalog.js` (the cleaned Bottle POS export) |
| `npm run build && npm start`, then `npm run test:pages` | Browser checks of every page type on desktop and phone: axe, age gate, filters + Back, load more, autocomplete |

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
