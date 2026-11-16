# Adams Shore Super Market & Liquors

**The website is in [`site/`](site/)**: a simple, fast store information site (hours, address,
phone, departments, map). It is plain HTML and CSS with no build step.

| File | What it is |
| --- | --- |
| `site/index.html` | The page. Store details (hours, address, phone) appear here and in the JSON-LD block at the top, which search engines read. Change both together. |
| `site/styles.css` | Look and layout. Brand colors are at the top. |
| `site/main.js` | Shows "Open now / Closed now" and highlights today's hours (Quincy time). |
| `site/_headers` | HTTPS and security headers, used by Cloudflare Pages. |
| `site/404.html` | Page shown for a wrong address. |

## Put it online (free, HTTPS)

1. Create a free account at [Cloudflare](https://dash.cloudflare.com/sign-up).
2. **Workers & Pages → Create → Pages → Connect to Git**, and pick this repository.
3. Settings: production branch `main`; framework preset *None*; build command empty; build
   output directory `site`.
4. Deploy. The site appears at `https://<project-name>.pages.dev` with HTTPS already on.
   Every later push to `main` updates it within a minute.
5. Later, to use your own domain: the Pages project → **Custom domains → Set up a domain**.
   HTTPS is set up automatically.

After it is online, add the address to your Google Business Profile's website field.

---

## Original prototype

The rest of this file describes the original prototype, a single page with a cart and a deli
builder, kept for reference. It is not the website.

Storefront for 494 Sea St, Quincy: cooler, deli sandwich builder, and every product on the shelf
with a drawn package image.

| Path | What it is |
| --- | --- |
| `src/store.html` | The page (edit this). Store details are in `CONFIG` near the top of the script. |
| `catalog.js` | Product list, generated. Do not edit by hand. |
| `data/pos-export-raw.json` | Bottle POS export the catalog is built from. |
| `scripts/build_catalog.py` | Cleans names, sorts products into departments and aisles, picks each product's package shape and colors. |
| `scripts/build_site.py` | Wraps the page into `docs/` for web hosting. |
| `scripts/match_photos.py` | Matches products to Open Food Facts entries (brand, flavor and drink type must agree). Writes `data/photo-matches-review.tsv` for spot checks. |
| `scripts/fetch_photos.py` | Downloads a front-of-pack photo per match from the Open Food Facts image archive, skipping nutrition and ingredient panels. |
| `scripts/enhance_photos.py` | Cuts each photo out of its background and centers it on white; keeps the plain photo when the cut-out goes wrong. |
| `data/photo-exclude.txt` | Products whose photo is wrong. Add a name to show the drawn package instead. |
| `scripts/build_photo_sheets.py` | Packs the photos into `photos/sheet-NN.webp` sprite sheets plus `photos/index.js`. |
| `docs/` | Ready-to-host site (GitHub Pages: Settings → Pages → branch, folder `/docs`). |

## Product photos

2,282 products show a real photo from [Open Food Facts](https://world.openfoodfacts.org) (CC BY-SA,
credited in the footer). The rest show a drawn package until a photo is added. To refresh photos,
stream the Open Food Facts CSV export into a candidates file (see the docstring in `match_photos.py`), then:

```sh
python3 scripts/match_photos.py candidates.tsv
python3 scripts/fetch_photos.py .photo-cache
python3 scripts/enhance_photos.py .photo-cache
python3 scripts/build_photo_sheets.py .photo-cache
```

### Automatic cleanup (free, runs in the cloud)

`.github/workflows/product-photos.yml` runs weekly on GitHub Actions (or on demand from the
Actions tab). It downloads each matched product's full-size photo from Open Food Facts,
removes the background with the open-source [rembg](https://github.com/danielgatis/rembg)
model (`scripts/enhance_photos.py`), centers the product on white like a delivery-app listing,
rebuilds `photos/` and `docs/`, and commits them. No API keys needed. The cleaned photos are
adaptations of CC BY-SA images, so they stay CC BY-SA and the footer credit must stay.

Kroger API photos were dropped: Kroger's terms (§5e) don't allow storing or publicly
displaying API content outside a live app.

## Rebuild

```sh
python3 scripts/build_catalog.py   # after a new POS export
python3 scripts/build_site.py      # after editing src/store.html
```

## Still needed from the store

- Prices: add to `PRICES` in `src/store.html`, or send the Bottle POS item export with prices.
- Photos for the remaining products (mostly wine, spirits and local craft beer): set
  `PHOTOS["Product name"] = "photos/file.webp"` in `src/store.html`.
- Order email and the store's own DoorDash and Uber Eats links (`CONFIG`).
- Deli: confirm the sandwich names and builder options match the real menu.
