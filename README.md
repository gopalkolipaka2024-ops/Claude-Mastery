# Adams Shore Super Market & Liquors — online store

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
| `scripts/build_photo_sheets.py` | Packs the photos into `photos/sheet-NN.webp` sprite sheets plus `photos/index.js`. |
| `docs/` | Ready-to-host site (GitHub Pages: Settings → Pages → branch, folder `/docs`). |

## Product photos

2,282 products show a real photo from [Open Food Facts](https://world.openfoodfacts.org) (CC BY-SA,
credited in the footer). The rest show a drawn package until a photo is added. To refresh photos,
stream the Open Food Facts CSV export into a candidates file (see the docstring in `match_photos.py`), then:

```sh
python3 scripts/match_photos.py candidates.tsv
python3 scripts/fetch_photos.py .photo-cache
python3 scripts/build_photo_sheets.py .photo-cache
```

### Official photos (free, runs in the cloud)

`.github/workflows/product-photos.yml` runs daily on GitHub Actions. It fetches official
front-of-pack photos through the free Kroger Developer API (`scripts/kroger_api_photos.py`),
fills gaps from Open Food Facts, rebuilds `photos/` and `docs/`, and commits them. Setup:
create an app at https://developer.kroger.com with the Products API, then add repository
secrets `KROGER_CLIENT_ID` and `KROGER_CLIENT_SECRET`. Official photos replace Open Food
Facts ones automatically.

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
