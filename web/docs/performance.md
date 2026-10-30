# Performance

Budgets (from the spec) and where each is enforced. The **Web quality** workflow
(`.github/workflows/web-quality.yml`) runs on every pull request that touches `web/` and fails
when a budget is broken.

| Budget | Limit | Enforced by |
| --- | --- | --- |
| First-load JavaScript per route (gzip) | 150 KB | `scripts/check-js-budget.mjs` |
| Lighthouse Performance, Accessibility, Best Practices, SEO | 95+ | `lighthouserc.cjs` (median of 5 runs, mobile, simulated slow 4G) |
| Largest Contentful Paint | < 2.5 s | `lighthouserc.cjs` |
| Cumulative Layout Shift | < 0.1 | `lighthouserc.cjs` |
| Interaction to Next Paint | < 200 ms | Lab stand-in: Total Blocking Time < 200 ms. Field INP needs real-user monitoring (Phase 8). |

Pages checked: Home `/`, Category `/c/beer`, Search `/search?q=coors`, Product `/p/coors-light-30-pk`.

**Search and SEO.** Search results are `noindex` on purpose (Google advises keeping internal
search pages out of its index), which alone caps Lighthouse's SEO score at 63. CI skips only that
one audit on Search; every other SEO audit is still required there.

## How the pages stay fast

- **Almost no client JavaScript of our own.** React and Next.js take about 131 KB; the site's
  own code adds about 13 KB (header search box, menus). Filters, sort and "Load more" are plain
  links and a GET form rendered on the server. The mobile menu, filter sheet, age gate and photo
  gallery load their code only when needed.
- **Package drawings.** The first row of products (and the home hero) is drawn inline, so it
  paints with the HTML. The rest are cached SVG images at `/art/<id>-<hash>.svg` (immutable,
  one-year cache; the hash changes when the drawing does), loaded lazily. The product page keeps
  the animated inline drawing.
- **Photos** (when the catalog has them) go through the Next.js image optimizer as AVIF or WebP
  with responsive sizes, rendered by `Photo` without client JavaScript. The first row loads with
  high priority, the rest lazily, and a tiny blurred preview (`images.blur`) shows while each
  loads. Allowed photo hosts are set with `IMAGE_HOSTS`.
- **CSS is inlined** in the HTML (about 9 KB gzip), so there is no render-blocking stylesheet.
- **Two self-hosted font files** (41 KB), preloaded, `font-display: swap` with size-matched
  fallbacks so swapping causes no layout shift.
- **No third-party scripts.** The map loads only when someone taps "Show map".

## Running it locally

```sh
npm run build
npm run lhci                        # starts the server itself; reports in .lighthouseci/
npm start -- -p 3100 & npm run budget:js
```

Lighthouse's simulated throttling varies from run to run on shared machines (single runs here
ranged from 2.0 to 3.6 s LCP on the same build), which is why CI judges the median of five.
