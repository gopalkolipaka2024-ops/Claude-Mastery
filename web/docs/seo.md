# SEO

Everything here is built from real store and catalog data. Anything we don't have yet (prices,
stock, brands, photos, map coordinates) is left out, never guessed.

## Going live

Both settings are read **at build time**:

| Variable | Value | Effect |
| --- | --- | --- |
| `SITE_URL` | the real domain, e.g. `https://www.example.com` | Canonical URLs, Open Graph URLs, sitemap and structured-data links |
| `SITE_INDEXABLE` | `1` on production only | Turns on indexing (`robots` meta and robots.txt). Previews and staging stay blocked. |

After launch, submit `https://<domain>/sitemap.xml` in Google Search Console and Bing Webmaster Tools.

## Per page

| Page | Title / description | Canonical | Indexed | Structured data |
| --- | --- | --- | --- | --- |
| Home | store name; what we sell, address, phone | `/` | yes | LiquorStore (hours, address, phone, holiday hours) |
| Department `/c/beer` | department, product count, top aisles, address | clean path | yes, **noindex** with any filter, sort, price or page parameter | BreadcrumbList |
| Aisle `/c/beer/light-beer` | aisle, count, two best-sellers | clean path | same rule as departments | BreadcrumbList |
| Product `/p/<slug>` | name, size, category, call to confirm | `/p/<slug>` | yes | Product + Offer (once a price exists) and BreadcrumbList |
| Search | query | `/search` | **noindex** (internal search results) | BreadcrumbList |
| Deals | current deals | `/deals` | **noindex while no deal is live** (and left out of the sitemap) | BreadcrumbList |
| Hours & directions | address, hours | `/store` | yes | LiquorStore, BreadcrumbList |
| Contact, legal pages | own title and description | own path | yes | none |
| 404 | "Page not found" | none | noindex | none |

Every page has a unique title, exactly one `h1` and headings that never skip a level. The
browser page checks (`npm run test:pages`) verify this, plus a canonical link and valid JSON-LD
on every page type.

**Product + Offer.** Price is the sale price while a sale runs (with `priceValidUntil` set to its
end date). Availability maps the stock badge: in stock → InStock, low → LimitedAvailability,
out → OutOfStock, and it's left out when stock is unknown. GTIN comes from the UPC when it's a
valid length. Search engines reject a Product with no offer, so products without a price get no
Product markup until the point-of-sale feed supplies prices.

## Social cards

Open Graph and Twitter cards on every page. Images are generated (1200×630 PNG): a site-wide
card, and one per product showing its name, size and package drawing.

## Sitemaps

`/sitemap.xml` is an index pointing to:
- `/sitemaps/pages.xml`: home, store, deals (when live), contact, legal pages
- `/sitemaps/categories.xml`: every department and aisle
- `/sitemaps/products-N.xml`: 5,000 products per file, with last-modified dates and photos when known

Filtered, sorted and paged listings are never in a sitemap. robots.txt blocks `/admin` and
`/api/` only, so crawlers can still see the noindex tags on filtered pages.
